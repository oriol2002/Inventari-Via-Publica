import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import admin from 'firebase-admin';
import { parse } from 'csv-parse';
import sharp from 'sharp';

const args = process.argv.slice(2);
const csvPath = args.find(arg => !arg.startsWith('--'));
const collectionArg = args.find(arg => arg.startsWith('--collection'));
const collection = collectionArg?.includes('=')
  ? collectionArg.split('=')[1]
  : args[args.indexOf('--collection') + 1];
const targetCollection = (collection || 'crossings').toLowerCase();

if (!csvPath) {
  console.error('Ús: node scripts/import-crossings-csv.mjs "C:\\Users\\oriol\\Downloads\\crossings_rows.csv" --collection crossings|reports');
  process.exit(1);
}

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!serviceAccountPath) {
  console.error('Falta FIREBASE_SERVICE_ACCOUNT o GOOGLE_APPLICATION_CREDENTIALS (ruta al JSON de servei).');
  process.exit(1);
}

const loadEnvFromFile = (filePath) => {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const [key, ...rest] = trimmed.split('=');
    if (!key) return;
    const value = rest.join('=').trim();
    if (!(key in process.env)) {
      process.env[key] = value.replace(/^"|"$/g, '');
    }
  });
};

loadEnvFromFile(path.resolve('.env.local'));

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET || `${serviceAccount.project_id}.appspot.com`;
admin.initializeApp({ credential: admin.credential.cert(serviceAccount), storageBucket });
const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true, preferRest: true });
const bucket = admin.storage().bucket();

const DEFAULT_LOCATION = { lat: 40.8122, lng: 0.5215, city: 'Tortosa', neighborhood: '' };

const parseLocation = (value) => {
  if (!value) return DEFAULT_LOCATION;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (e) {
    return DEFAULT_LOCATION;
  }
};

const parseDate = (value) => {
  if (!value) return Date.now();
  const asNumber = Number(value);
  if (!Number.isNaN(asNumber)) return asNumber;
  const asDate = Date.parse(value);
  return Number.isNaN(asDate) ? Date.now() : asDate;
};

const normalizeAssetType = (value) => {
  if (!value) return 'Pas de Vianants';
  if (value === 'Pas de Peatons') return 'Pas de Vianants';
  return value;
};

const parseDataUrl = (value) => {
  if (!value) return null;
  const str = String(value);
  if (!str.startsWith('data:')) return null;
  const matches = str.match(/^data:(.+);base64,(.+)$/);
  if (!matches) return null;
  return { mime: matches[1], data: matches[2] };
};

const toBuffer = (value) => {
  const parsed = parseDataUrl(value);
  if (parsed) return Buffer.from(parsed.data, 'base64');
  const str = String(value || '').trim();
  if (!str) return null;
  if (/^https?:\/\//i.test(str)) return null;
  try {
    return Buffer.from(str, 'base64');
  } catch (e) {
    return null;
  }
};

const makeDownloadUrl = (filePath, token) => {
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filePath)}?alt=media&token=${token}`;
};

const uploadImageBuffer = async (buffer, filePath) => {
  const token = crypto.randomUUID();
  const file = bucket.file(filePath);
  await file.save(buffer, {
    contentType: 'image/jpeg',
    metadata: {
      cacheControl: 'public, max-age=31536000, immutable',
      metadata: {
        firebaseStorageDownloadTokens: token
      }
    }
  });
  return makeDownloadUrl(filePath, token);
};

let skippedImages = 0;

const processImage = async (value, id, suffix) => {
  if (!value) return '';
  const str = String(value).trim();
  if (/^https?:\/\//i.test(str)) return str;
  const buffer = toBuffer(str);
  if (!buffer) {
    skippedImages += 1;
    return '';
  }
  const resized = await sharp(buffer)
    .rotate()
    .resize({ width: suffix === 'thumb' ? 420 : 1600, withoutEnlargement: true })
    .jpeg({ quality: suffix === 'thumb' ? 70 : 80, mozjpeg: true })
    .toBuffer();
  const filePath = `crossings/${id}/${suffix}.jpg`;
  return uploadImageBuffer(resized, filePath);
};

const normalizeRow = async (row) => {
  const id = row.id || row.ID;
  if (!id) {
    return { id };
  }
  const imageInput = row.image || '';
  const thumbInput = row.image_thumb || row.imageThumb || '';
  const image = await processImage(imageInput, id, 'image');
  const imageThumb = thumbInput
    ? await processImage(thumbInput, id, 'thumb')
    : (image ? await processImage(imageInput, id, 'thumb') : '');

  return {
    id,
    assetType: normalizeAssetType(row.asset_type || row.assetType || row.asset_type_id),
    image,
    imageThumb,
    location: parseLocation(row.location || row.location_json),
    state: row.state || 'Bo',
    lastPaintedDate: row.last_painted_date || row.lastPaintedDate || new Date().toISOString().split('T')[0],
    lastInspectedDate: row.last_inspected_date || row.lastInspectedDate || null,
    paintType: row.paint_type || row.paintType || null,
    notes: row.notes || '',
    createdAt: parseDate(row.created_at || row.createdAt),
    updatedAt: parseDate(row.updated_at || row.updatedAt),
    alertDismissed: row.alert_dismissed === 'true' || row.alertDismissed === 'true' || false
  };
};

const parseArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  const trimmed = String(value).trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {
    // fall through to manual parsing
  }
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return trimmed
      .slice(1, -1)
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);
  }
  return trimmed
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
};

const normalizeReportRow = (row) => {
  return {
    id: row.id || row.ID,
    title: row.title || '',
    date: row.date || row.report_date || new Date().toISOString().split('T')[0],
    type: row.type || row.report_type || 'maintenance',
    crossingIds: parseArray(row.crossing_ids || row.crossingIds || row.crossings || row.crossing_ids_array),
    createdAt: parseDate(row.created_at || row.createdAt),
    pdfUrl: row.pdf_url || row.pdfUrl || undefined
  };
};

const writer = db.bulkWriter({
  throttling: {
    maxOpsPerSecond: 100,
    maxPendingOperations: 500
  }
});
writer.onWriteError((error) => {
  if (error.failedAttempts < 10) {
    return true;
  }
  console.error('Error persistent en escriptura:', error.message);
  return false;
});

let total = 0;
let headersLogged = false;

const parser = fs.createReadStream(path.resolve(csvPath))
  .pipe(parse({ columns: true, relax_column_count: true, relax_quotes: true, skip_empty_lines: true }));

for await (const record of parser) {
  if (!headersLogged) {
    console.log('Headers detectats:', Object.keys(record));
    headersLogged = true;
  }

  const data = targetCollection === 'reports'
    ? normalizeReportRow(record)
    : await normalizeRow(record);
  if (!data.id) continue;

  const docRef = db.collection(targetCollection).doc(data.id);
  writer.set(docRef, data, { merge: true });
  total += 1;

  if (total % 500 === 0) {
    console.log(`Registres en cua: ${total}`);
  }
}

await writer.close();

console.log(`Importació completada. Total: ${total}`);
if (skippedImages > 0) {
  console.log(`Imatges massa grans ignorades: ${skippedImages}`);
}

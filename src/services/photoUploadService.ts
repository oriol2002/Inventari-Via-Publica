import type React from 'react';
import exifr from 'exifr';
import Compressor from 'compressorjs';
import { supabase } from './dbService';

const BUCKET = 'photos';

interface ExifData {
  lat: number | null;
  lng: number | null;
  capturedAt: string;
}

const createUuid = () => {
  if (crypto?.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

// Llegir EXIF (GPS + data)
const readExif = async (file: File): Promise<ExifData> => {
  try {
    const exif: any = await exifr.parse(file, { gps: true, tiff: true, exif: true });
    const lat = typeof exif?.latitude === 'number' ? exif.latitude : null;
    const lng = typeof exif?.longitude === 'number' ? exif.longitude : null;

    const capturedAt =
      (exif?.DateTimeOriginal instanceof Date && exif.DateTimeOriginal.toISOString()) ||
      (exif?.CreateDate instanceof Date && exif.CreateDate.toISOString()) ||
      new Date().toISOString();

    return { lat, lng, capturedAt };
  } catch (error) {
    console.warn('Error llegint EXIF:', error);
    return { lat: null, lng: null, capturedAt: new Date().toISOString() };
  }
};

// Comprimir imatge a max 800px d’ample, quality ~0.7, sense EXIF
const compressImage = async (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    new Compressor(file, {
      maxWidth: 800,
      quality: 0.7,
      mimeType: 'image/webp',
      convertTypes: ['image/png', 'image/jpeg', 'image/heic', 'image/heif'],
      success(result: Blob) {
        const compressedFile = new File([result], `${createUuid()}.webp`, {
          type: 'image/webp',
          lastModified: Date.now(),
        });
        resolve(compressedFile);
      },
      error(err: Error) {
        reject(err);
      },
    });
  });
};

// Processar fitxer: EXIF + compressió + pujada + insert
export const processFile = async (file: File, userId: string) => {
  if (!userId) {
    const error = new Error('userId és obligatori per pujar la foto');
    console.error(error);
    return { success: false, error };
  }

  try {
    // 1) Llegir EXIF (GPS + data)
    const { lat, lng, capturedAt } = await readExif(file);

    // 2) Comprimir imatge (sense EXIF)
    const compressed = await compressImage(file);

    // 3) Pujar a Supabase Storage
    const fileName = `${createUuid()}.webp`;
    const filePath = `photos/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, compressed, {
        cacheControl: '31536000',
        contentType: compressed.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Error pujant imatge:', uploadError);
      return { success: false, error: uploadError };
    }

    // 4) Insertar registre a Postgres
    const { error: insertError } = await supabase
      .from('incidencies_fotos')
      .insert([
        {
          photo_url: filePath,
          lat,
          lng,
          captured_at: capturedAt,
          user_id: userId,
        },
      ]);

    if (insertError) {
      console.error('Error inserint registre:', insertError);
      return { success: false, error: insertError };
    }

    const { data: publicUrlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(filePath);

    return { success: true, path: filePath, publicUrl: publicUrlData?.publicUrl };
  } catch (error) {
    console.error('Error processant fitxer:', error);
    return { success: false, error };
  }
};

// Handler per input[type="file"]
export const handleFileChange = async (
  event: React.ChangeEvent<HTMLInputElement>,
  userId: string
) => {
  const files = event.target.files;
  if (!files || files.length === 0) return [];

  // Processar tots els fitxers en paral·lel
  const results = await Promise.all(
    Array.from(files).map((file) => processFile(file, userId))
  );

  return results;
};

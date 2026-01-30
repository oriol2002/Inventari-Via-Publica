import type React from 'react';
import exifr from 'exifr';
import Compressor from 'compressorjs';
import { supabase } from './dbService';
import { firebaseDb, firebaseStorage } from './firebaseService';
import { addDoc, collection } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

const BUCKET = 'photos';
const OFFLINE_MODE = (import.meta as any).env?.VITE_OFFLINE_MODE === 'true';
const BACKEND = ((import.meta as any).env?.VITE_BACKEND as string) || 'supabase';

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

// Comprimir imatge a mida/quality configurables, sense EXIF
const compressImage = async (file: File, maxWidth: number, quality: number): Promise<File> => {
  return new Promise((resolve, reject) => {
    new Compressor(file, {
      maxWidth,
      quality,
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
  if (OFFLINE_MODE) {
    const error = new Error('Mode OFFLINE actiu: no es pujaran imatges');
    console.warn(error.message);
    return { success: false, error };
  }

  if (!userId) {
    const error = new Error('userId és obligatori per pujar la foto');
    console.error(error);
    return { success: false, error };
  }

  try {
    // 1) Llegir EXIF (GPS + data)
    const { lat, lng, capturedAt } = await readExif(file);

    // 2) Comprimir imatge gran + thumbnail (sense EXIF)
    const compressed = await compressImage(file, 800, 0.7);
    const compressedThumb = await compressImage(file, 240, 0.6);

    // 3) Pujar a Storage
    const fileName = `${createUuid()}.webp`;
    const filePath = `photos/${fileName}`;
    const thumbPath = `photos/thumbs/${fileName}`;

    if (BACKEND === 'firebase') {
      const mainRef = ref(firebaseStorage, filePath);
      const thumbRef = ref(firebaseStorage, thumbPath);

      await uploadBytes(mainRef, compressed, {
        contentType: compressed.type,
        cacheControl: 'public,max-age=31536000,immutable'
      } as any);
      await uploadBytes(thumbRef, compressedThumb, {
        contentType: compressedThumb.type,
        cacheControl: 'public,max-age=31536000,immutable'
      } as any);

      const publicUrl = await getDownloadURL(mainRef);
      const publicThumbUrl = await getDownloadURL(thumbRef);

      await addDoc(collection(firebaseDb, 'incidencies_fotos'), {
        photo_url: filePath,
        thumb_url: thumbPath,
        lat,
        lng,
        captured_at: capturedAt,
        user_id: userId
      });

      return {
        success: true,
        path: filePath,
        thumbPath,
        publicUrl,
        publicThumbUrl
      };
    }

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, compressed, {
        cacheControl: '31536000',
        contentType: compressed.type,
        upsert: false,
      });

    if (!uploadError) {
      await supabase.storage
        .from(BUCKET)
        .upload(thumbPath, compressedThumb, {
          cacheControl: '31536000',
          contentType: compressedThumb.type,
          upsert: false,
        });
    }

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

    const { data: publicThumbUrlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(thumbPath);

    return { 
      success: true, 
      path: filePath, 
      thumbPath,
      publicUrl: publicUrlData?.publicUrl,
      publicThumbUrl: publicThumbUrlData?.publicUrl
    };
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

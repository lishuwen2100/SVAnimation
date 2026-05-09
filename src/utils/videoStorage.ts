// IndexedDB 视频存储工具

const DB_NAME = "svanimation-videos";
const DB_VERSION = 1;
const STORE_NAME = "videos";

/**
 * 视频存储记录
 */
export interface VideoRecord {
  id: string;
  file: Blob;
  fileName: string;
  fileSize: number;
  duration: number;
  uploadedAt: number;
}

/**
 * 打开 IndexedDB 数据库
 */
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error("Failed to open IndexedDB"));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 创建对象存储
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        objectStore.createIndex("uploadedAt", "uploadedAt", { unique: false });
      }
    };
  });
};

/**
 * 生成唯一 ID
 */
const generateVideoId = (): string => {
  return `video-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * 保存视频到 IndexedDB
 * @param file 视频文件
 * @param fileName 文件名
 * @param duration 视频时长
 * @returns 视频 ID
 */
export const saveVideo = async (
  file: Blob,
  fileName: string,
  duration: number
): Promise<string> => {
  const db = await openDB();
  const id = generateVideoId();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const objectStore = transaction.objectStore(STORE_NAME);

    const record: VideoRecord = {
      id,
      file,
      fileName,
      fileSize: file.size,
      duration,
      uploadedAt: Date.now(),
    };

    const request = objectStore.add(record);

    request.onsuccess = () => {
      resolve(id);
    };

    request.onerror = () => {
      reject(new Error("Failed to save video"));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
};

/**
 * 获取视频数据
 * @param id 视频 ID
 * @returns 视频记录
 */
export const getVideo = async (id: string): Promise<VideoRecord | null> => {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.get(id);

    request.onsuccess = () => {
      resolve(request.result || null);
    };

    request.onerror = () => {
      reject(new Error("Failed to get video"));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
};

/**
 * 获取视频 Blob URL
 * @param id 视频 ID
 * @returns Blob URL 或 null
 */
export const getVideoUrl = async (id: string): Promise<string | null> => {
  const record = await getVideo(id);
  if (!record) return null;

  return URL.createObjectURL(record.file);
};

/**
 * 删除视频
 * @param id 视频 ID
 */
export const deleteVideo = async (id: string): Promise<void> => {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error("Failed to delete video"));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
};

/**
 * 获取所有视频 ID
 * @returns 视频 ID 列表
 */
export const getAllVideoIds = async (): Promise<string[]> => {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.getAllKeys();

    request.onsuccess = () => {
      resolve(request.result as string[]);
    };

    request.onerror = () => {
      reject(new Error("Failed to get video IDs"));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
};

/**
 * 清理未使用的视频
 * @param usedIds 正在使用的视频 ID 集合
 */
export const cleanupUnusedVideos = async (usedIds: Set<string>): Promise<number> => {
  const allIds = await getAllVideoIds();
  let deletedCount = 0;

  for (const id of allIds) {
    if (!usedIds.has(id)) {
      await deleteVideo(id);
      deletedCount++;
    }
  }

  return deletedCount;
};

/**
 * 获取存储统计信息
 */
export const getStorageStats = async (): Promise<{
  count: number;
  totalSize: number;
}> => {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.getAll();

    request.onsuccess = () => {
      const records = request.result as VideoRecord[];
      const totalSize = records.reduce((sum, record) => sum + record.fileSize, 0);
      resolve({
        count: records.length,
        totalSize,
      });
    };

    request.onerror = () => {
      reject(new Error("Failed to get storage stats"));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
};

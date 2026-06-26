/* ImageUpload.jsx — pick an image → edit it (PhotoEditor) → upload to Storage →
   hand back the public URL. Render-prop so each surface (avatar, cover banner,
   product dropzone) styles its own trigger:

     <ImageUpload aspect={1} round pathFor={() => avatarPath(uid)}
       onUploaded={url => …} onError={e => toast(e.message)}>
       {({ pick, uploading, progress }) => <button onClick={pick}>…</button>}
     </ImageUpload>
*/
import React from 'react';
import PhotoEditor from './PhotoEditor.jsx';
import { uploadImage } from '../lib/storage.js';
const { useState, useRef } = React;

export default function ImageUpload({
  aspect = 1, round = false, outputSize = 800, title = 'Edit photo',
  pathFor, onUploaded, onError, children,
}) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(null); // null = idle, 0..1 = uploading

  const pick = () => inputRef.current?.click();
  const onPick = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!f.type.startsWith('image/')) { onError?.(new Error('Please choose an image file.')); return; }
    if (f.size > 12 * 1024 * 1024) { onError?.(new Error('That image is too large (max 12MB).')); return; }
    setFile(f);
  };

  const handleSave = async (blob) => {
    setFile(null);
    setProgress(0);
    try {
      const url = await uploadImage(pathFor(), blob, setProgress);
      onUploaded(url);
    } catch (err) {
      onError?.(err);
    } finally {
      setProgress(null);
    }
  };

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onPick} />
      {children({ pick, uploading: progress != null, progress: progress || 0 })}
      {file && (
        <PhotoEditor
          file={file} aspect={aspect} round={round} outputSize={outputSize} title={title}
          onCancel={() => setFile(null)} onSave={handleSave}
        />
      )}
    </>
  );
}

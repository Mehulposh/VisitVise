import { useEffect, useRef, useState } from "react";
import { Camera, RefreshCw } from "lucide-react";
import { Button } from "./ui";

/** Opens the phone/tablet camera (or a file picker on desktop). onFile(File|null). */
export default function PhotoCapture({ onFile, label = "Take a photo", facing = "user" }) {
  const ref = useRef(); const [url, setUrl] = useState("");
  useEffect(() => () => url && URL.revokeObjectURL(url), [url]);
  const pick = (e) => { const f = e.target.files[0]; if (!f) return; if (f.size > 4 * 1024 * 1024) { alert("Please choose a photo under 4 MB."); return; } setUrl(URL.createObjectURL(f)); onFile(f); };
  return (
    <div className="flex items-center gap-4">
      {url ? <img src={url} alt="Preview" className="h-24 w-24 rounded-2xl object-cover ring-2 ring-teal-400/50" /> : <div className="grid h-24 w-24 place-items-center rounded-2xl border-2 border-dashed border-teal-400/50 text-teal-500"><Camera size={28} /></div>}
      <div><Button type="button" variant="soft" size="sm" onClick={() => ref.current.click()}>{url ? <><RefreshCw size={14} /> Retake</> : <><Camera size={14} /> {label}</>}</Button>
        <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" capture={facing} hidden onChange={pick} /></div>
    </div>
  );
}

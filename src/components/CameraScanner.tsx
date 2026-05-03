import React, { useRef, useState, useEffect } from 'react';
import { Camera, FlipHorizontal, Loader2 } from 'lucide-react';

interface CameraScannerProps {
  onRecognize: (data: { passportId: string; name: string; country?: string; nationality?: string; dob?: string; sex?: string; expiryDate: string }, logText?: string) => void;
  onScanError: (error: string, logText?: string) => void;
  onScanStart?: () => void;
}

export function CameraScanner({ onRecognize, onScanError, onScanStart }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [flipMode, setFlipMode] = useState<number>(0); // 0: none, 1: horizontal, 2: vertical, 3: both
  const [isScanning, setIsScanning] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let active = true;

    const initCamera = async () => {
      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

        let newStream: MediaStream;
        try {
          newStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { exact: "environment" } }
          });
        } catch (exactErr) {
          newStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" } }
          });
        }

        if (!active) {
          newStream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = newStream;
        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
        }
        setErrorMsg('');
      } catch (err: any) {
        console.error("Camera access failed", err);
        if (active) setErrorMsg("无法访问摄像头: " + err.message);
      }
    };

    initCamera();

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const cycleFlipMode = () => {
    setFlipMode((prev) => (prev + 1) % 4);
  };

  const getTransform = () => {
    switch(flipMode) {
      case 1: return 'scaleX(-1)';
      case 2: return 'scaleY(-1)';
      case 3: return 'scale(-1, -1)';
      default: return 'none';
    }
  };

  const getFlipLabel = () => {
    switch(flipMode) {
      case 1: return '左右镜像';
      case 2: return '上下翻转';
      case 3: return '对角颠倒';
      default: return '正常图像';
    }
  };

  const captureAndRecognize = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setIsScanning(true);
    if (onScanStart) onScanStart();
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    
    // 只截取画面中间 40% 的区域以排除上方干扰元素并减少模型识别耗时
    const cropRatio = 0.4;
    const cropHeight = Math.round(videoHeight * cropRatio);
    const startY = Math.round((videoHeight - cropHeight) / 2);

    let targetWidth = videoWidth;
    let targetHeight = cropHeight;
    const MAX_DIM = 800; // 降低最大分辨率加速处理
    
    if (targetWidth > MAX_DIM || targetHeight > MAX_DIM) {
      if (targetWidth > targetHeight) {
        targetHeight = Math.round((targetHeight * MAX_DIM) / targetWidth);
        targetWidth = MAX_DIM;
      } else {
        targetWidth = Math.round((targetWidth * MAX_DIM) / targetHeight);
        targetHeight = MAX_DIM;
      }
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Apply transformations for canvas snapshot
    if (flipMode === 1) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    } else if (flipMode === 2) {
      ctx.translate(0, canvas.height);
      ctx.scale(1, -1);
    } else if (flipMode === 3) {
      ctx.translate(canvas.width, canvas.height);
      ctx.scale(-1, -1);
    }
    
    // Draw the horizontally cropped area
    ctx.drawImage(video, 0, startY, videoWidth, cropHeight, 0, 0, canvas.width, canvas.height);
    const base64Image = canvas.toDataURL('image/jpeg', 0.6); // 高压缩率
    setCapturedImage(base64Image);

    // Reset transform
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    try {
      const response = await fetch('/api/ocr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ image: base64Image })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || '识别失败');
      }

      const notesBlock = result.notes ? `\n\nNotes: ${result.notes}` : '';
      const logText = `[✅ Recognition Successful]\n\n` +
        `Passport number: ${result.passportId || 'N/A'}\n` +
        `Name: ${result.name || ''}\n` +
        `Issuing country: ${result.country || 'N/A'}\n` +
        `Nationality: ${result.nationality || 'N/A'}\n` +
        `Birth date: ${result.dob || 'N/A'}\n` +
        `Expiry date: ${result.expiryDate || 'N/A'}\n` +
        `Sex: ${result.sex || 'N/A'}\n` +
        `Checksum valid: ${result.checksumValid || false}\n\n` +
        `Raw MRZ:\n${result.rawMrz || ''}` +
        notesBlock;

      onRecognize({
        passportId: result.passportId || '',
        name: result.name || '',
        country: result.country || '',
        nationality: result.nationality || '',
        dob: result.dob || '',
        sex: result.sex || '',
        expiryDate: result.expiryDate || ''
      }, logText);
    } catch (err: any) {
      const errorLog = `[❌ Recognition Failed]\n\nError: ${err.message || '识别失败'}`;
      onScanError(err.message || '识别失败', errorLog);
    } finally {
      setIsScanning(false);
      setCapturedImage(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {errorMsg ? (
        <div className="text-red-500 text-sm p-4">{errorMsg}</div>
      ) : (
        <div className="relative w-full aspect-video bg-black overflow-hidden">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            style={{ transform: getTransform() }}
            className={`w-full h-full object-cover transition-transform duration-300 ${capturedImage ? 'opacity-0' : 'opacity-100'}`}
          />
          
          {!capturedImage && !isScanning && (
            <div className="absolute inset-0 pointer-events-none flex flex-col z-10">
              <div className="flex-1 bg-black/60 backdrop-blur-[1px]"></div>
              <div className="h-[40%] border-y-2 border-accent/80 relative shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]">
                <div className="absolute top-2 left-2 bg-black/60 text-white/90 text-[11px] px-3 py-1 rounded font-medium tracking-wide">
                  请将护照下方两行字母对准此框
                </div>
              </div>
              <div className="flex-1 bg-black/60 backdrop-blur-[1px]"></div>
            </div>
          )}

          {capturedImage && (
            <img 
              src={capturedImage} 
              alt="Scan capture" 
              className="absolute inset-0 w-full h-full object-contain bg-black" 
            />
          )}
          
          {isScanning && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white font-medium text-xs">
              <Loader2 className="h-8 w-8 animate-spin mb-2 text-accent" />
              正在识别 MRZ...
            </div>
          )}
        </div>
      )}
      
      <canvas ref={canvasRef} className="hidden" />

      <div className="flex items-center gap-4 w-full">
        <button 
          type="button"
          onClick={cycleFlipMode} 
          disabled={isScanning}
          className="flex-1 bg-element hover:bg-border text-main py-4 rounded-lg text-base flex items-center justify-center gap-2 transition-colors disabled:opacity-50 font-bold border border-border"
        >
          <FlipHorizontal className="h-5 w-5" /> {getFlipLabel()}
        </button>

        <button 
          type="button"
          onClick={captureAndRecognize} 
          disabled={isScanning}
          className="flex-1 bg-accent hover:opacity-90 text-white font-bold py-4 rounded-lg flex items-center justify-center gap-2 transition-opacity shadow-sm disabled:opacity-50 text-base"
        >
          {isScanning ? '识别中...' : <React.Fragment><Camera className="h-5 w-5" /> 拍照并识别</React.Fragment>}
        </button>
      </div>
    </div>
  );
}

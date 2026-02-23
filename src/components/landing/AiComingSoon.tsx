import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ApiError,
  getPublicHaircutSuggestions,
  type HaircutSuggestionResult,
} from "@/lib/api";

const MAX_CAPTURE_DIMENSION = 1280;
const TARGET_UPLOAD_BYTES = 1_000_000;

const AiComingSoon = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [capturedImageDataUrl, setCapturedImageDataUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<HaircutSuggestionResult | null>(null);

  const stopCamera = () => {
    if (!streamRef.current) return;
    for (const track of streamRef.current.getTracks()) {
      track.stop();
    }
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraOpen(false);
  };

  const startCamera = async () => {
    try {
      setErrorMessage(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setErrorMessage("No se pudo abrir la camara frontal. Revisa permisos del navegador.");
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      setErrorMessage("La camara aun no esta lista. Intenta nuevamente.");
      return;
    }

    const scale = Math.min(1, MAX_CAPTURE_DIMENSION / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) {
      setErrorMessage("No se pudo procesar la imagen.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = compressCanvasToDataUrl(canvas, TARGET_UPLOAD_BYTES);
    setCapturedImageDataUrl(dataUrl);
    setResult(null);
    setErrorMessage(null);
    stopCamera();
  };

  const analyzePhoto = async () => {
    if (!capturedImageDataUrl) return;
    try {
      setProcessing(true);
      setErrorMessage(null);
      const response = await getPublicHaircutSuggestions(capturedImageDataUrl);
      setResult(response);
    } catch (error) {
      const message = error instanceof ApiError && error.status === 429
        ? "Hay mucha demanda de simulacion IA ahora. Reintenta en 10-15 segundos."
        : error instanceof Error && error.message.toLowerCase().includes("failed to fetch")
          ? "No pudimos conectar con el servidor (ERR_EMPTY_RESPONSE). Revisa que backend esté activo y vuelve a intentar."
        : error instanceof Error
          ? error.message
          : "No se pudo analizar la foto";
      setErrorMessage(message);
    } finally {
      setProcessing(false);
    }
  };

  const resetFlow = () => {
    setCapturedImageDataUrl(null);
    setResult(null);
    setErrorMessage(null);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <section id="ai" className="py-16">
      <div className="container px-6">
        <div className="glass-card rounded-2xl p-6 md:p-10 border border-primary/30 space-y-5">
          <div className="text-center space-y-2">
            <p className="text-primary text-xs font-medium uppercase tracking-widest">Prueba de corte con IA</p>
            <h3 className="text-2xl md:text-3xl font-display font-bold">
              Descubre que corte te queda mejor
            </h3>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Toma una selfie frontal y recibe recomendaciones automaticas de estilo.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4 items-start">
            <div className="space-y-3">
              {!capturedImageDataUrl && (
                <div className="aspect-[4/5] bg-secondary/30 border border-border rounded-xl overflow-hidden flex items-center justify-center">
                  {cameraOpen ? (
                    <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center px-6">
                      <Camera className="w-8 h-8 text-primary mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Activa la camara frontal para comenzar</p>
                    </div>
                  )}
                </div>
              )}

              {capturedImageDataUrl && (
                <img
                  src={capturedImageDataUrl}
                  alt="Foto capturada para analisis"
                  className="aspect-[4/5] w-full object-cover border border-border rounded-xl"
                />
              )}

              <div className="flex flex-wrap gap-2">
                {!cameraOpen && !capturedImageDataUrl && (
                  <Button onClick={startCamera}>
                    <Camera className="w-4 h-4 mr-2" />
                    Abrir camara
                  </Button>
                )}
                {cameraOpen && (
                  <>
                    <Button onClick={capturePhoto}>Tomar foto</Button>
                    <Button variant="secondary" onClick={stopCamera}>Cancelar</Button>
                  </>
                )}
                {capturedImageDataUrl && (
                  <>
                    <Button onClick={analyzePhoto} disabled={processing}>
                      {processing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Analizando...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Analizar con IA
                        </>
                      )}
                    </Button>
                    <Button variant="secondary" onClick={resetFlow}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Repetir
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {errorMessage && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  {errorMessage}
                </div>
              )}

              {!result && !errorMessage && (
                <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
                  Cuando analices tu foto, aqui veras los cortes sugeridos y el motivo de cada uno.
                </div>
              )}

              {result && (
                <div className="space-y-3">
                  {result.previewImageDataUrl && (
                    <div className="rounded-lg border border-border p-4">
                      <p className="text-xs uppercase tracking-widest text-primary mb-2">
                        Simulacion visual: {result.previewStyleName || "corte sugerido"}
                      </p>
                      <img
                        src={result.previewImageDataUrl}
                        alt="Simulacion de corte con IA"
                        className="w-full aspect-[4/5] object-cover rounded-lg border border-border/70"
                      />
                    </div>
                  )}
                  {result.previewMessage && (
                    <p className="text-xs text-muted-foreground">{result.previewMessage}</p>
                  )}
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-xs uppercase tracking-widest text-primary mb-1">Descripcion detectada</p>
                    <p className="text-sm text-muted-foreground">{result.detectedDescription}</p>
                  </div>
                  {result.suggestions.map((item, index) => (
                    <div key={`${item.styleName}-${index}`} className="rounded-lg border border-border p-4">
                      <p className="font-display text-lg">{item.styleName}</p>
                      <p className="text-sm text-muted-foreground mt-1">{item.reason}</p>
                      <p className="text-xs text-primary mt-2">Mantenimiento: {item.maintenance}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const estimateDataUrlBytes = (dataUrl: string): number => {
  const base64 = dataUrl.split(",")[1] ?? "";
  return Math.ceil((base64.length * 3) / 4);
};

const compressCanvasToDataUrl = (sourceCanvas: HTMLCanvasElement, targetBytes: number): string => {
  let canvas = sourceCanvas;
  for (let resizeAttempt = 0; resizeAttempt < 4; resizeAttempt += 1) {
    let quality = 0.88;
    while (quality >= 0.5) {
      const candidate = canvas.toDataURL("image/jpeg", quality);
      if (estimateDataUrlBytes(candidate) <= targetBytes) {
        return candidate;
      }
      quality -= 0.08;
    }

    const nextWidth = Math.max(320, Math.round(canvas.width * 0.85));
    const nextHeight = Math.max(320, Math.round(canvas.height * 0.85));
    if (nextWidth === canvas.width && nextHeight === canvas.height) {
      break;
    }

    const resized = document.createElement("canvas");
    resized.width = nextWidth;
    resized.height = nextHeight;
    const resizedCtx = resized.getContext("2d");
    if (!resizedCtx) {
      break;
    }
    resizedCtx.drawImage(canvas, 0, 0, nextWidth, nextHeight);
    canvas = resized;
  }

  return canvas.toDataURL("image/jpeg", 0.5);
};

export default AiComingSoon;

// @ts-ignore - The pipeline export dynamically loads environments in workers
import { pipeline, FeatureExtractionPipeline } from '@xenova/transformers';

let extractor: FeatureExtractionPipeline | null = null;

// Initialize the pipeline asynchronously ensuring model weights download once
async function initPipeline() {
  if (!extractor) {
    // This will download the ~22MB quantized model into the browser cache
    extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      quantized: true, 
    });
  }
  return extractor;
}

self.onmessage = async (event: MessageEvent) => {
  const { id, text, type } = event.data;
  
  if (type === 'PING') {
    // Used during rendering to warm up the model and show accurate loading state
    try {
      await initPipeline();
      self.postMessage({ id, status: 'READY' });
    } catch (e) {
      self.postMessage({ id, status: 'ERROR', error: String(e) });
    }
    return;
  }

  if (type === 'EMBED') {
    try {
      const ext = await initPipeline();
      
      // Execute Inference
      const output = await ext(text, { pooling: 'mean', normalize: true });
      
      // Convert Tensor Float32Array to standard Array for zero-copy postMessage constraints & serializable IDB storage
      const embeddingArray = Array.from(output.data);
      
      self.postMessage({ id, status: 'SUCCESS', embedding: embeddingArray });
    } catch (e) {
      self.postMessage({ id, status: 'ERROR', error: String(e) });
    }
  }
};

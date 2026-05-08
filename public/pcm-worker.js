/**
 * PCMPlayer 音频处理器
 * 运行在 AudioWorklet 线程中，用于实时播放传递过来的 PCM 数据流
 */
class PCMPlayer extends AudioWorkletProcessor {
  constructor() {
    super();
    this.chunks = []; // 存放接收到的音频数据块 (Float32Array)
    this.readOffset = 0; // 当前数据块的读取偏移量

    // 监听主线程发送过来的音频数据
    this.port.onmessage = (e) => {
      this.chunks.push(e.data);
    };
  }

  /**
   * 音频处理回调
   * @param {Float32Array[][]} inputs 输入音频数据 (此处未使用)
   * @param {Float32Array[][]} outputs 输出音频数据
   * @returns {boolean} 返回 true 以保持处理器持续运行
   */
  process(inputs, outputs) {
    const output = outputs[0][0]; // 获取第一个输出通道
    if (!output || this.chunks.length === 0) return true;

    let outputOffset = 0;
    // 循环填充输出缓冲区，直到输出写满或没有更多输入数据
    while (outputOffset < output.length && this.chunks.length > 0) {
      const chunk = this.chunks[0];
      // 计算本次可以从当前 chunk 复制的数据量
      const count = Math.min(chunk.length - this.readOffset, output.length - outputOffset);

      // 将数据复制到输出缓冲区
      for (let i = 0; i < count; i++) {
        output[outputOffset + i] = chunk[this.readOffset + i];
      }

      outputOffset += count;
      this.readOffset += count;

      // 如果当前数据块已读完，则切换到下一个块
      if (this.readOffset >= chunk.length) {
        this.chunks.shift();
        this.readOffset = 0;
      }
    }

    return true;
  }
}

registerProcessor('pcm-player', PCMPlayer);

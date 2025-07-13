import { FFmpeg } from '/@ffmpeg/ffmpeg';
export async function loadFFmpeg(status) {
    const ffmpeg = FFmpeg({ log: true });
    status.addEventListener('onLoad', async () => {
        message.textContent = 'Loading FFmpeg...';
        try {
            await ffmpeg.load();
            message.textContent = 'FFmpeg loaded successfully!';
        } catch (error) {
            console.error('FFmpeg failed to load:', error);
            message.textContent = 'Failed to load FFmpeg. Check console for details.';
        }
    });
    return ffmpeg;
}
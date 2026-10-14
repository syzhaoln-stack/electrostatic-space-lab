"""Local audio validation and subtitle packaging; no service requests."""
from pathlib import Path
import array
import json
import math
import wave

ROOT = Path(__file__).resolve().parent
manifest_path = ROOT / 'podcast-manifest.json'
manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
if manifest.get('status') != 'generated_pcm_and_mp3_decode_verified':
    raise SystemExit('Audio generation is not complete; no manifest status changed.')
with wave.open(str(ROOT / manifest['wav_file']), 'rb') as wav:
    width = wav.getsampwidth()
    raw = wav.readframes(wav.getnframes())
if width != 2:
    raise SystemExit('Metrics require PCM 16-bit; no unsupported reinterpretation performed.')
samples = array.array('h', raw)
peak = max(abs(x) for x in samples)
rms = math.sqrt(sum(x*x for x in samples) / len(samples))
clipped = sum(abs(x) >= 32767 for x in samples)
manifest['qa'].update({'pcm_peak_dbfs': 20*math.log10(peak/32768) if peak else None,
                       'pcm_rms_dbfs': 20*math.log10(rms/32768) if rms else None,
                       'full_scale_samples': clipped,
                       'all_returned_subtitles_match_script': all(s['subtitle_text_matches'] is True for s in manifest['segments'])})
timeline = json.loads((ROOT / manifest['timeline_file']).read_text(encoding='utf-8'))
def stamp(seconds):
    ms = round(seconds * 1000)
    return f'{ms // 3600000:02}:{ms // 60000 % 60:02}:{ms // 1000 % 60:02}.{ms % 1000:03}'
vtt = ['WEBVTT', '']
for idx, item in enumerate(timeline, 1):
    vtt += [str(idx), f"{stamp(item['start'])} --> {stamp(item['end'])}",
            f"{item['speaker']}：{item['text']}", '']
vtt_path = ROOT / 'media/electric-field-dialogue.vtt'
vtt_path.write_text('\n'.join(vtt), encoding='utf-8')
manifest['caption_file'] = 'media/electric-field-dialogue.vtt'
manifest['references'] = [
    'https://docs.volcengine.com/docs/DoubaoVoice/audio-generation-http?lang=zh',
    'https://docs.volcengine.com/docs/real_time_communication/ConfigureTextToSpeechTTS?lang=zh',
    'https://github.com/bytedance/agentkit-samples/blob/main/skills/byted-podcast-gen/SKILL.md'
]
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({'duration_seconds': manifest['duration_seconds'], 'qa': manifest['qa']}, ensure_ascii=False))

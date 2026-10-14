"""Normalize dialogue loudness locally, preserving original WAV and turn assets."""
from pathlib import Path
import hashlib
import json
import subprocess

ROOT = Path(__file__).resolve().parent
path = ROOT / 'podcast-manifest.json'
manifest = json.loads(path.read_text(encoding='utf-8'))
source = ROOT / manifest['wav_file']
target = ROOT / manifest['audio_file']
temporary = target.with_name('electric-field-dialogue.normalized.mp3')
def analysis(file):
    p = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(file), '-af',
                        'loudnorm=I=-18:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'],
                       capture_output=True, text=True, encoding='utf-8', errors='replace', check=True)
    return json.loads(p.stderr[p.stderr.rfind('{'):p.stderr.rfind('}')+1])
measured = analysis(source)
af = ('loudnorm=I=-18:TP=-1.5:LRA=11:linear=true:'
      f"measured_I={measured['input_i']}:measured_TP={measured['input_tp']}:"
      f"measured_LRA={measured['input_lra']}:measured_thresh={measured['input_thresh']}:"
      f"offset={measured['target_offset']}")
subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(source),
                '-af', af, '-ar', '48000', '-codec:a', 'libmp3lame', '-b:a', '128k', str(temporary)], check=True)
verified = analysis(temporary)
temporary.replace(target)
manifest['sha256'] = hashlib.sha256(target.read_bytes()).hexdigest()
manifest['qa']['final_mp3_loudness'] = {'integrated_lufs': float(verified['input_i']),
                                      'true_peak_dbtp': float(verified['input_tp']),
                                      'loudness_range_lu': float(verified['input_lra']),
                                      'full_decode': True}
manifest['qa']['pcm_metrics_refer_to'] = 'Original unnormalized WAV; MP3 has local loudness normalization.'
manifest['post_processing'] = 'Two-pass FFmpeg loudnorm; target −18 LUFS and −1.5 dBTP; no time stretching.'
path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({'audio_file': manifest['audio_file'], 'duration_seconds': manifest['duration_seconds'],
                  'final_mp3_loudness': manifest['qa']['final_mp3_loudness']}, ensure_ascii=False))

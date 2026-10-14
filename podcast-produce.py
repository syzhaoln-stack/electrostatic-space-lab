"""Make the approved two-voice educational dialogue with the existing Doubao helper.
Uses only the helper's DOUBAO_SPEECH_API_KEY process environment convention.
Each segment has an exclusive record; ambiguous requests are never repeated.
"""
from pathlib import Path
import hashlib
import json
import subprocess
import sys
import wave

ROOT = Path(__file__).resolve().parent
MEDIA = ROOT / 'media'
WORK = MEDIA / 'podcast-production'
HELPER = Path('C:/Users/zhaos/.codex/skills/construction-safety-video/scripts/doubao_tts.py')
VOICES = {'学习者': 'zh_female_vv_uranus_bigtts', '物理同伴': 'zh_male_m191_uranus_bigtts'}
LINES = [
    ('学习者', '我把电场箭头指向目标，电子怎么往另一边偏？'),
    ('物理同伴', '先暂停。箭头表示正电荷的受力方向，电子带负电，它的受力方向正好相反。'),
    ('学习者', '那把箭头反过来，电子就沿着它走？'),
    ('物理同伴', '还要看它原来的速度。电场改变速度，轨迹得一步一步积累。看看受力箭头和速度箭头，它们现在同向吗？'),
    ('学习者', '不一样！我刚才只顾着对准目标了。'),
    ('物理同伴', '现在只提高发射速度，场保持不变。先猜落点，再发射。'),
    ('学习者', '它经过这片区域更快了，所以受到的影响时间也变了。'),
    ('物理同伴', '对。再旋转视角：正面看着到位，深度方向也到位了吗？'),
    ('学习者', '还差一截！我要操纵的是整个空间里的轨迹。'),
    ('物理同伴', '这也是电子束控制的核心问题。现在换你来：只改一个源电荷，让下一次更接近目标。'),
]

def save(path, obj):
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding='utf-8')

def pcm_info(path):
    with wave.open(str(path), 'rb') as wav:
        params = wav.getparams()
        data = wav.readframes(wav.getnframes())
    if len(data) != params.nframes * params.nchannels * params.sampwidth:
        raise RuntimeError('Incomplete PCM segment')
    return params, data

def main():
    WORK.mkdir(parents=True, exist_ok=True)
    save(ROOT / 'podcast-script.json', [{'speaker': s, 'text': t, 'voice': VOICES[s]} for s, t in LINES])
    manifest = {'status': 'generating', 'provider': 'Doubao / Volcano OpenSpeech',
                'model': 'seed-audio-1.0', 'synthetic_voices': VOICES,
                'route': 'Existing single-speaker helper per dialogue turn, then local concatenation',
                'audio_file': None, 'segments': [], 'auditory_review': 'not performed',
                'notes': 'Preset synthetic voices; no person imitated. Not a PodcastTTS auto-script run.'}
    save(ROOT / 'podcast-manifest.json', manifest)
    for idx, (speaker, line) in enumerate(LINES, 1):
        stem = f'turn-{idx:02}'
        req, txt = WORK / f'{stem}.request.json', WORK / f'{stem}.txt'
        rec, wav = WORK / f'{stem}.record.json', WORK / f'{stem}.wav'
        if rec.exists():
            prior = json.loads(rec.read_text(encoding='utf-8'))
            if prior.get('state') != 'completed_pcm_verified' or not wav.exists():
                raise RuntimeError(f'{stem} has an incomplete record; no retry sent')
        else:
            txt.write_text(line, encoding='utf-8')
            save(req, {'model': 'seed-audio-1.0',
                       'text_prompt': '用自然、清楚的普通话，像同伴交谈一样朗读。语气温和，有思考感。只朗读以下正文，不读说明，不加音乐或音效：\n' + line,
                       'references': [{'speaker': VOICES[speaker]}],
                       'audio_config': {'format': 'wav', 'sample_rate': 48000, 'speech_rate': 0,
                                        'pitch_rate': 0, 'loudness_rate': 0, 'enable_subtitle': True}})
            result = subprocess.run([sys.executable, str(HELPER), 'synthesize', '--request', str(req),
                                     '--expected-text', str(txt), '--record', str(rec), '--output', str(wav)],
                                    capture_output=True, text=True, encoding='utf-8')
            if result.returncode:
                manifest['status'] = 'segment_failed_no_retry'
                manifest['failed_segment'] = idx
                save(ROOT / 'podcast-manifest.json', manifest)
                # The helper writes a redacted record. Never repeat arbitrary HTTP bodies here.
                raise RuntimeError(f'{stem} failed; inspect the redacted record; no retry sent')
        record = json.loads(rec.read_text(encoding='utf-8'))
        info, data = pcm_info(wav)
        sub_path = WORK / f'{stem}.subtitle.json'
        sub = json.loads(sub_path.read_text(encoding='utf-8')) if sub_path.exists() else {}
        manifest['segments'].append({'index': idx, 'speaker': speaker, 'voice': VOICES[speaker], 'text': line,
                                     'duration_seconds': info.nframes / info.framerate,
                                     'file': str(wav.relative_to(ROOT)).replace('\\', '/'),
                                     'sha256': hashlib.sha256(data).hexdigest(),
                                     'subtitle_text_matches': sub.get('expected_text_matches')})
        save(ROOT / 'podcast-manifest.json', manifest)
        print(f'Completed segment {idx}/10: {info.nframes / info.framerate:.2f}s', flush=True)
    final_wav = MEDIA / 'electric-field-dialogue.wav'
    params, _ = pcm_info(WORK / 'turn-01.wav')
    gap_frames = round(params.framerate * 0.18)
    silence = b'\x00' * gap_frames * params.nchannels * params.sampwidth
    current = 0.0
    timeline = []
    with wave.open(str(final_wav), 'wb') as out:
        out.setnchannels(params.nchannels)
        out.setsampwidth(params.sampwidth)
        out.setframerate(params.framerate)
        for idx, segment in enumerate(manifest['segments']):
            p, data = pcm_info(ROOT / segment['file'])
            if (p.nchannels, p.sampwidth, p.framerate) != (params.nchannels, params.sampwidth, params.framerate):
                raise RuntimeError('Segment PCM formats differ')
            out.writeframes(data)
            timeline.append({'start': current, 'end': current + segment['duration_seconds'],
                             'speaker': segment['speaker'], 'text': segment['text']})
            current += segment['duration_seconds']
            if idx != len(manifest['segments']) - 1:
                out.writeframes(silence)
                current += gap_frames / params.framerate
    final_params, final_pcm = pcm_info(final_wav)
    mp3 = MEDIA / 'electric-field-dialogue.mp3'
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(final_wav),
                    '-codec:a', 'libmp3lame', '-b:a', '128k', str(mp3)], check=True)
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', str(mp3), '-f', 'null', '-'], check=True)
    save(MEDIA / 'electric-field-dialogue.timeline.json', timeline)
    manifest.update(status='generated_pcm_and_mp3_decode_verified', audio_file='media/electric-field-dialogue.mp3',
                    wav_file='media/electric-field-dialogue.wav', timeline_file='media/electric-field-dialogue.timeline.json',
                    duration_seconds=final_params.nframes / final_params.framerate,
                    sha256=hashlib.sha256(mp3.read_bytes()).hexdigest(),
                    qa={'all_pcm_frames_read': True, 'mp3_full_decode': True,
                        'within_60_to_90_seconds': 60 <= current <= 90,
                        'human_listening_review': False})
    save(ROOT / 'podcast-manifest.json', manifest)
    print(json.dumps({'status': manifest['status'], 'duration_seconds': manifest['duration_seconds'],
                      'audio_file': manifest['audio_file']}, ensure_ascii=False), flush=True)

if __name__ == '__main__':
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    main()

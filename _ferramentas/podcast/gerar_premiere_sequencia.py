#!/usr/bin/env python3
"""
Gera projeto Premiere (FCP7 xmeml v4) com N audios em sequencia.

- Ordena os .mp3 pelo prefixo numerico (1_, 2_, ... 32_).
- Detecta silencio no fim de cada clipe (ffmpeg silencedetect) e corta
  o que passar de MAX_TAIL segundos de silencio.
- Cada clipe comeca OVERLAP segundos antes do fim do anterior
  (sobreposicao de voz), alternando entre A1 e A2.
- Fade in de FADE_IN segundos por keyframes de Audio Levels.

Uso:
  python gerar_premiere_sequencia.py --pasta <dir com mp3> --out projeto.xml [--nome "2porcento"]
"""
import argparse, glob, os, re, subprocess, sys, urllib.parse
from xml.sax.saxutils import escape

FPS = 30
TICKS_PER_SEC = 254016000000
OVERLAP = 0.3    # sobreposicao de voz entre clipes (s)
FADE_IN = 0.3    # fade in por clipe (s)
MAX_TAIL = 0.5   # silencio maximo permitido no fim de cada clipe (s)
NOISE = "-45dB"  # limiar do silencedetect
MIN_SIL = 0.15   # duracao minima pra contar como silencio (s)


def file_url(path):
    p = os.path.abspath(path).replace("\\", "/")
    if not p.startswith("/"):
        p = "/" + p
    return "file://localhost" + urllib.parse.quote(p, safe="/:")


def probe_duration(path):
    out = subprocess.check_output([
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", path
    ], text=True).strip()
    return float(out)


def trailing_silence(path, dur):
    """Retorna segundos de silencio no fim do arquivo (0.0 se nao houver)."""
    proc = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", path,
         "-af", f"silencedetect=noise={NOISE}:d={MIN_SIL}", "-f", "null", "-"],
        capture_output=True, text=True)
    log = proc.stderr
    starts = [float(m) for m in re.findall(r"silence_start:\s*([\d.]+)", log)]
    ends = [float(m) for m in re.findall(r"silence_end:\s*([\d.]+)", log)]
    if not starts:
        return 0.0
    last_start = starts[-1]
    # silencio conta como "no fim" se vai ate (quase) o fim do arquivo
    last_end = ends[-1] if len(ends) >= len(starts) else dur
    if dur - last_end > 0.1:
        return 0.0
    return max(0.0, dur - last_start)


def ticks(frames):
    return int(round(frames / FPS * TICKS_PER_SEC))


def audio_clip(cid, name, path, start_f, out_f, fade_frames):
    """Clipe em in=0..out_f (fonte), posicionado em start_f na sequencia."""
    url = file_url(path)
    nm = escape(name)
    end_f = start_f + out_f
    return f"""
        <clipitem id="clip-{cid}">
          <masterclipid>master-{cid}</masterclipid>
          <name>{nm}</name><enabled>TRUE</enabled>
          <duration>{out_f}</duration>
          <rate><timebase>{FPS}</timebase><ntsc>FALSE</ntsc></rate>
          <start>{start_f}</start><end>{end_f}</end><in>0</in><out>{out_f}</out>
          <pproTicksIn>0</pproTicksIn><pproTicksOut>{ticks(out_f)}</pproTicksOut>
          <file id="file-{cid}"><name>{nm}</name><pathurl>{escape(url)}</pathurl>
            <rate><timebase>{FPS}</timebase><ntsc>FALSE</ntsc></rate>
            <duration>{out_f}</duration>
            <media><audio><samplecharacteristics><depth>16</depth><samplerate>48000</samplerate>
              </samplecharacteristics><channelcount>2</channelcount></audio></media>
          </file>
          <sourcetrack><mediatype>audio</mediatype><trackindex>1</trackindex></sourcetrack>
          <filter><effect><name>Audio Levels</name><effectid>audiolevels</effectid>
            <effectcategory>audiolevels</effectcategory><effecttype>audiolevels</effecttype>
            <mediatype>audio</mediatype><pproBypass>false</pproBypass>
            <parameter authoringApp="PremierePro"><parameterid>level</parameterid><name>Level</name>
              <valuemin>0</valuemin><valuemax>3.98109</valuemax>
              <keyframe><when>0</when><value>0</value></keyframe>
              <keyframe><when>{fade_frames}</when><value>1</value></keyframe>
            </parameter>
          </effect></filter>
        </clipitem>"""


def num_key(path):
    m = re.match(r"(\d+)", os.path.basename(path))
    return int(m.group(1)) if m else 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pasta", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--nome", default="sequencia")
    a = ap.parse_args()

    files = sorted(glob.glob(os.path.join(a.pasta, "*.mp3")), key=num_key)
    if not files:
        sys.exit(f"Nenhum .mp3 em {a.pasta}")

    overlap_f = round(OVERLAP * FPS)
    fade_f = round(FADE_IN * FPS)

    clips = []  # (arquivo, start_frame, out_frame)
    cursor = 0
    for f in files:
        dur = probe_duration(f)
        tail = trailing_silence(f, dur)
        keep = dur - max(0.0, tail - MAX_TAIL)
        out_f = max(1, round(keep * FPS))
        start_f = max(0, cursor - overlap_f) if clips else 0
        clips.append((f, start_f, out_f))
        cursor = start_f + out_f
        cut = tail - MAX_TAIL
        print(f"{os.path.basename(f):20s} dur={dur:6.2f}s  silencio_fim={tail:5.2f}s"
              f"  corte={max(0, cut):5.2f}s  entra_em={start_f / FPS:7.2f}s")

    tracks = {0: [], 1: []}  # A1 / A2 alternados
    for i, (f, start_f, out_f) in enumerate(clips):
        tracks[i % 2].append(audio_clip(f"a{i + 1}", os.path.basename(f), f, start_f, out_f, fade_f))

    total_f = cursor
    track_xml = ""
    for t in (0, 1):
        track_xml += (f"""
        <track currentExplodedTrackIndex="0" totalExplodedTrackCount="1" premiereTrackType="Stereo">{''.join(tracks[t])}
          <enabled>TRUE</enabled><locked>FALSE</locked><outputchannelindex>{t + 1}</outputchannelindex>
        </track>""")

    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE xmeml>
<xmeml version="4">
  <sequence id="seq-1" explodedTracks="true">
    <name>{escape(a.nome)}</name>
    <duration>{total_f}</duration>
    <rate><timebase>{FPS}</timebase><ntsc>FALSE</ntsc></rate>
    <in>-1</in><out>-1</out>
    <timecode>
      <rate><timebase>{FPS}</timebase><ntsc>FALSE</ntsc></rate>
      <string>00:00:00:00</string><frame>0</frame><displayformat>NDF</displayformat>
    </timecode>
    <media>
      <video>
        <format><samplecharacteristics>
          <rate><timebase>{FPS}</timebase><ntsc>FALSE</ntsc></rate>
          <width>1080</width><height>1920</height>
          <anamorphic>FALSE</anamorphic>
          <pixelaspectratio>square</pixelaspectratio>
          <fielddominance>none</fielddominance>
          <colordepth>24</colordepth>
        </samplecharacteristics></format>
      </video>
      <audio>
        <numOutputChannels>2</numOutputChannels>
        <format><samplecharacteristics><depth>16</depth><samplerate>48000</samplerate></samplecharacteristics></format>{track_xml}
      </audio>
    </media>
  </sequence>
</xmeml>
"""
    with open(a.out, "w", encoding="utf-8") as fh:
        fh.write(xml)
    print(f"\nOK: {a.out}  ({len(clips)} clipes, {total_f / FPS:.1f}s no total)")
    print("Premiere: File > Import > selecionar o XML.")


if __name__ == "__main__":
    main()

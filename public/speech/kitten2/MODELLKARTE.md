---
license: apache-2.0
library_name: onnx
pipeline_tag: text-to-speech
language: [en, de, es, it, pt, ru, hi, fr]
tags: [text-to-speech, onnx, int8, int4, safetensors, pytorch, kittentts]
---
# Kitten TTS 2 Nano

17M parameters per language model, 8 languages,
37 voices, 24 kHz. ONNX with int8 weights (**17.4 MB** per language) or int4 weights (**8.8 MB** per language); both run on CPU,
no PyTorch needed. And the float32 PyTorch weights.

## Usage

```bash
pip install kittenml
```

```python
from kittenml import KittenTTS
import soundfile as sf

m = KittenTTS("KittenML/kitten-tts-2-nano")          # or the path of this directory
print(m.available_voices)                 # {"en": ["Eleanor", ...], "de": ["Anna", ...], ...}
for v in m.voices("de"):                  # name and description of each voice
    print(v["name"], v["description"])

audio = m.generate("Hello there, this is Kitten TTS 2 Nano.", voice="Eleanor")
audio = m.generate("Guten Morgen! Wie geht es dir?", voice="Paul", speed=1.1)    # the voice sets the language
audio = m.generate("Guten Morgen! Wie geht es dir?", language="de")          # the language's first voice (Anna)
sf.write("out.wav", audio, 24000)

m = KittenTTS("KittenML/kitten-tts-2-nano", weights="int4")                   # int4 ONNX, 8.8 MB per language
m = KittenTTS("KittenML/kitten-tts-2-nano", backend="torch")                  # PyTorch, float32 weights
m = KittenTTS("KittenML/kitten-tts-2-nano", backend="torch", device="cuda")   # on a GPU
audio = m.generate("Hello there, this is Kitten TTS 2 Nano.", voice="Eleanor")
```

`backend="onnx"` (the default) runs an ONNX graph with ONNX Runtime: the int8 one by default, the int4 one with
`weights="int4"` (needs `onnxruntime>=1.20`). `backend="torch"` runs the float32 weights in PyTorch. Only the
files the selected backend and weight format need are downloaded.

`voice` takes a name from the tables below (any case: `"Paul"` or `"paul"`) or its description.
Without `voice`, a language's first voice speaks.

## Voices

Each voice is a first name; its voice pack is stored under the lowercase name in `voices_<lang>.npz`. The English
voices carry the names of the same characters in KittenTTS 2.

**English** (`en`)

| voice | description |
|---|---|
| Eleanor | Somber historian (female) |
| Martha | Weathered radio journalist (female) |
| Serena | Gentle yoga instructor (female) |
| Iris | Hushed museum guide (female) |
| Grace | Soothing nurse (female) |
| Edith | Elderly grandmother soft (female) |
| Otis | Rumbling blues musician (male) |
| Vincent | Hushed museum guide (male) |
| Max | Energetic sports announcer (male) |
| Danny | Cheerful podcast host (male) |

**German** (`de`)

| voice | description |
|---|---|
| Anna | Female 1 |
| Mia | Female 2 |
| Lukas | Male 1 |
| Paul | Male 2 |

**Spanish** (`es`)

| voice | description |
|---|---|
| Sofia | Female 1 |
| Elena | Female 2 |
| Pablo | Male 1 |
| Mateo | Male 2 |

**Italian** (`it`)

| voice | description |
|---|---|
| Francesca | Female 1 |
| Alessandro | Male 1 |
| Giorgio | Male 2 |
| Davide | Male 3 |

**Portuguese (Brazil)** (`pt`)

| voice | description |
|---|---|
| Juliana | Female 1 |
| Larissa | Female 2 |
| Gustavo | Male 1 |
| Caio | Male 2 |

**Russian** (`ru`)

| voice | description |
|---|---|
| Olga | Female 1 |
| Tatiana | Female 2 |
| Sergei | Male 1 |
| Alexei | Male 2 |

**Hindi** (`hi`)

| voice | description |
|---|---|
| Priya | Female 1 |
| Ananya | Female 2 |
| Arjun | Male 1 |
| Vikram | Male 2 |

**French** (`fr`)

| voice | description |
|---|---|
| Juliette | Female 1 |
| Gabriel | Male 1 |
| Nicolas | Male 2 |


## License

Apache-2.0 (the models, voice packs and the bundled G2P files).

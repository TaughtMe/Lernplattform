"""Erzeugt ein winziges Test-Sprachmodell für e2e/sprachmodell.spec.ts.

Das "Audio" sind die Token-IDs selbst: audio = input_ids * speed + sum(style).
So prüft der Browser-Test die ganze Kette (Phonemizer, Tokenizer, Stilzeile,
ONNX Runtime, Wiedergabe), ohne ein echtes Modell. Aufruf mit onnx und numpy:
  python make-fixtures.py
"""
import numpy as np
import onnx
from onnx import TensorProto, helper

ids = helper.make_tensor_value_info("input_ids", TensorProto.INT64, [1, "n"])
style = helper.make_tensor_value_info("style", TensorProto.FLOAT, [1, 256])
speed = helper.make_tensor_value_info("speed", TensorProto.FLOAT, [1])
audio = helper.make_tensor_value_info("waveform", TensorProto.FLOAT, ["n"])

nodes = [
    helper.make_node("Cast", ["input_ids"], ["ids_f"], to=TensorProto.FLOAT),
    helper.make_node("Mul", ["ids_f", "speed"], ["scaled"]),
    helper.make_node("ReduceSum", ["style"], ["style_sum"], keepdims=0),
    helper.make_node("Add", ["scaled", "style_sum"], ["shifted"]),
    helper.make_node("Reshape", ["shifted", "flat"], ["waveform"]),
]
flat = helper.make_tensor("flat", TensorProto.INT64, [1], [-1])
graph = helper.make_graph(nodes, "lernraum-test", [ids, style, speed], [audio], [flat])
model = helper.make_model(graph, opset_imports=[helper.make_opsetid("", 13)])
model.ir_version = 8
onnx.checker.check_model(model)
onnx.save(model, "model.onnx")

# Zeile r einer Stimme summiert sich zu r: Der Test sieht, welche Zeile gewählt wurde.
rows = np.stack([np.full(256, r / 256, dtype=np.float32) for r in range(3)])
np.savez("voices.npz", **{"test-voice": rows})

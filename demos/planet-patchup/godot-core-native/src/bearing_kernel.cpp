// Native translation of bearing_constraint.gd.
// Fixed-world-anchor port of Matter.Constraint preSolveAll/solve/postSolveAll.
// The MIT License (MIT)
//
// Copyright (c) Liam Brummitt and contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
//
#include "bearing_kernel.h"
#include <algorithm>
#include <cmath>
#include <godot_cpp/core/class_db.hpp>
using namespace godot;
void PPBearingKernel::_bind_methods() {
  ClassDB::bind_method(
      D_METHOD("phase", "body", "constraint", "iterations", "time_scale"),
      &PPBearingKernel::phase, DEFVAL(4), DEFVAL(1.0));
}
void PPBearingKernel::phase(Dictionary body, Dictionary constraint,
                            int64_t iterations, double time_scale) {
  Dictionary impulse = body["constraintImpulse"], position = body["position"],
             previous = body["positionPrev"], a = constraint["pointA"],
             b = constraint["pointB"];
  position["x"] = double(position["x"]) + double(impulse["x"]);
  position["y"] = double(position["y"]) + double(impulse["y"]);
  body["angle"] = double(body["angle"]) + double(impulse["angle"]);
  for (int64_t i = 0; i < iterations; ++i) {
    double angle = double(body["angle"]) - double(constraint["angleB"]),
           c = std::cos(angle), s = std::sin(angle), old_x = b["x"];
    b["x"] = old_x * c - double(b["y"]) * s;
    b["y"] = old_x * s + double(b["y"]) * c;
    constraint["angleB"] = body["angle"];
    double dx = double(a["x"]) - double(position["x"]) - double(b["x"]),
           dy = double(a["y"]) - double(position["y"]) - double(b["y"]);
    double length = std::max(0.000001, std::sqrt(dx * dx + dy * dy)),
           stiffness = double(constraint["stiffness"]) * time_scale;
    double fx = dx * (length - double(constraint["length"])) / length *
                stiffness,
           fy = dy * (length - double(constraint["length"])) / length *
                stiffness;
    double damping = double(constraint["damping"]) * time_scale;
    if (damping > 0) {
      double nx = dx / length, ny = dy / length;
      double nv = nx * (double(position["x"]) - double(previous["x"])) +
                  ny * (double(position["y"]) - double(previous["y"]));
      previous["x"] = double(previous["x"]) + damping * nx * nv;
      previous["y"] = double(previous["y"]) + damping * ny * nv;
    }
    impulse["x"] = double(impulse["x"]) + fx;
    impulse["y"] = double(impulse["y"]) + fy;
    position["x"] = double(position["x"]) + fx;
    position["y"] = double(position["y"]) + fy;
    double torque =
        (double(b["x"]) * fy - double(b["y"]) * fx) /
        (double(body["inverseMass"]) + double(body["inverseInertia"])) *
        double(body["inverseInertia"]);
    impulse["angle"] = double(impulse["angle"]) + torque;
    body["angle"] = double(body["angle"]) + torque;
  }
  impulse["x"] = double(impulse["x"]) * 0.4;
  impulse["y"] = double(impulse["y"]) * 0.4;
  impulse["angle"] = double(impulse["angle"]) * 0.4;
}

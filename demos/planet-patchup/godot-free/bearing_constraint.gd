extends RefCounted

# Fixed-world-anchor port of Matter.Constraint preSolveAll/solve/postSolveAll.
# The MIT License (MIT)
# 
# Copyright (c) Liam Brummitt and contributors.
# 
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
# 
# The above copyright notice and this permission notice shall be included in
# all copies or substantial portions of the Software.
# 
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
# THE SOFTWARE.

func phase(body: Dictionary, constraint: Dictionary, iterations := 4, time_scale := 1.0) -> void:
	var impulse: Dictionary = body.constraintImpulse
	body.position.x += impulse.x
	body.position.y += impulse.y
	body.angle += impulse.angle
	for i in range(iterations):
		var angle: float = body.angle - constraint.angleB
		var c := cos(angle)
		var s := sin(angle)
		var old_x: float = constraint.pointB.x
		constraint.pointB.x = old_x * c - constraint.pointB.y * s
		constraint.pointB.y = old_x * s + constraint.pointB.y * c
		constraint.angleB = body.angle
		var dx: float = constraint.pointA.x - body.position.x - constraint.pointB.x
		var dy: float = constraint.pointA.y - body.position.y - constraint.pointB.y
		var length := maxf(0.000001, sqrt(dx * dx + dy * dy))
		var stiffness: float = constraint.stiffness * time_scale
		var fx: float = dx * (length - constraint.length) / length * stiffness
		var fy: float = dy * (length - constraint.length) / length * stiffness
		var damping: float = constraint.damping * time_scale
		if damping > 0:
			var nx := dx / length
			var ny := dy / length
			var normal_velocity: float = nx * (body.position.x - body.positionPrev.x) + ny * (body.position.y - body.positionPrev.y)
			body.positionPrev.x += damping * nx * normal_velocity
			body.positionPrev.y += damping * ny * normal_velocity
		impulse.x += fx
		impulse.y += fy
		body.position.x += fx
		body.position.y += fy
		var torque: float = (constraint.pointB.x * fy - constraint.pointB.y * fx) / (body.inverseMass + body.inverseInertia) * body.inverseInertia
		impulse.angle += torque
		body.angle += torque
	impulse.x *= 0.4
	impulse.y *= 0.4
	impulse.angle *= 0.4

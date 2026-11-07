shader_type canvas_item;
render_mode unshaded;

uniform sampler2D worldmap : source_color, filter_linear, repeat_enable;
uniform float yaw = 0.0;
uniform float pitch = 0.0;
uniform vec4 restoration_a = vec4(0.0);
uniform vec2 restoration_b = vec2(0.0);

vec3 anchor(int i) {
	// Paid campaign art order: 1, 0, 2, 3, 4, 5.
	vec2 degrees = vec2(18.0, 125.0);
	if (i == 1) degrees = vec2(-38.0, 155.0);
	if (i == 2) degrees = vec2(8.0, -100.0);
	if (i == 3) degrees = vec2(32.0, -25.0);
	if (i == 4) degrees = vec2(-25.0, 30.0);
	if (i == 5) degrees = vec2(46.0, 55.0);
	vec2 a = radians(degrees);
	return vec3(sin(a.y)*cos(a.x), sin(a.x), cos(a.y)*cos(a.x));
}
float restored(int i) {
	if (i == 0) return restoration_a.x;
	if (i == 1) return restoration_a.y;
	if (i == 2) return restoration_a.z;
	if (i == 3) return restoration_a.w;
	if (i == 4) return restoration_b.x;
	return restoration_b.y;
}
vec3 base_color(vec2 uv) {
	vec2 dimensions = vec2(textureSize(worldmap, 0));
	vec3 original = texture(worldmap, uv).rgb;
	float edge = min(uv.x * dimensions.x, dimensions.x - 1.0 - uv.x * dimensions.x);
	if (edge >= 0.0 && edge < 48.0) {
		float f = (48.0-edge)/48.0;
		vec3 opposite = texture(worldmap, vec2((dimensions.x-1.0)/dimensions.x-uv.x,uv.y)).rgb;
		original = mix(original,(original+opposite)*0.5,f*f*(3.0-2.0*f));
	}
	return original;
}
void fragment() {
	float opacity = COLOR.a;
	// Match the original 192px framebuffer, displayed at 2x with nearest edges.
	vec2 pixel = floor(UV * 192.0);
	vec2 normal = (pixel-vec2(95.5))/85.0;
	normal.y = -normal.y;
	float rr = dot(normal,normal);
	if (rr > 1.0) { COLOR = vec4(0.0); }
	else {
		vec3 v = vec3(normal,sqrt(1.0-rr));
		float yy=v.y*cos(pitch)+v.z*sin(pitch);
		float zz=-v.y*sin(pitch)+v.z*cos(pitch);
		vec3 w=vec3(v.x*cos(yaw)+zz*sin(yaw),yy,-v.x*sin(yaw)+zz*cos(yaw));
		vec2 uv=vec2(fract(atan(w.x,w.z)/6.28318530718+0.5),0.5-asin(clamp(w.y,-1.0,1.0))/3.14159265359);
		vec3 warped=w+0.04*vec3(sin(w.y*5.0+w.z*3.0),sin(w.z*4.0+w.x*2.0),sin(w.x*5.0+w.y*4.0));
		float first=-10.0;
		float second=-10.0;
		int a=0;
		int b=0;
		for (int i=0;i<6;i++) {
			float score=dot(warped,anchor(i));
			if (score>first) { second=first;b=a;first=score;a=i; }
			else if (score>second) { second=score;b=i; }
		}
		float weight=0.5+0.5*smoothstep(0.0,0.045,first-second);
		float amount=restored(a)*weight+restored(b)*(1.0-weight);
		vec3 dirty=base_color(uv);
		vec3 clean=min(vec3(1.0),dirty*vec3(1.08,1.15,1.12)+vec3(7.0/255.0));
		float light=0.56+0.44*max(0.0,dot(v,vec3(-0.38,0.42,0.82)));
		float rim=max(0.0,(rr-0.95)/0.05);
		COLOR=vec4(mix(dirty,clean,amount)*light*(1.0-rim*0.18)+vec3(116.0,110.0,112.0)/255.0*rim*0.18,1.0);
	}
	COLOR.a *= opacity;
}

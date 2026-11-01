extends RefCounted

const MAX_SAFE_INTEGER := 9007199254740991
# Import/transaction size guard; amounts beyond JSON's integer precision use decimal strings.
const MAX_DIGITS := 128

static func valid(value: Variant) -> bool:
	if value is String:
		if value.is_empty() or value.length() > MAX_DIGITS or (value.length() > 1 and value[0] == "0"):
			return false
		for i in value.length():
			if value.unicode_at(i) < 48 or value.unicode_at(i) > 57:
				return false
		return true
	return typeof(value) in [TYPE_INT, TYPE_FLOAT] and is_finite(float(value)) and value >= 0 and value <= MAX_SAFE_INTEGER and float(value) == floor(float(value))

static func digits(value: Variant) -> String:
	return value if value is String else str(int(value))

static func compare(a: Variant, b: Variant) -> int:
	var left := digits(a)
	var right := digits(b)
	if left.length() != right.length():
		return 1 if left.length() > right.length() else -1
	return 0 if left == right else 1 if left > right else -1

static func pack(value: String) -> Variant:
	return int(value) if compare(value, MAX_SAFE_INTEGER) <= 0 else value

static func add(a: Variant, b: Variant) -> Variant:
	var left := digits(a)
	var right := digits(b)
	var result := ""
	var carry := 0
	var i := left.length() - 1
	var j := right.length() - 1
	while i >= 0 or j >= 0 or carry > 0:
		var total := carry + (left.unicode_at(i) - 48 if i >= 0 else 0) + (right.unicode_at(j) - 48 if j >= 0 else 0)
		result = str(total % 10) + result
		carry = total / 10
		i -= 1
		j -= 1
	return pack(result)

static func subtract(a: Variant, b: Variant) -> Variant:
	if compare(a, b) < 0:
		return null
	var left := digits(a)
	var right := digits(b)
	var result := ""
	var borrow := 0
	var j := right.length() - 1
	for i in range(left.length() - 1, -1, -1):
		var value := left.unicode_at(i) - 48 - borrow - (right.unicode_at(j) - 48 if j >= 0 else 0)
		borrow = int(value < 0)
		result = str(value + 10 * borrow) + result
		j -= 1
	while result.length() > 1 and result[0] == "0":
		result = result.substr(1)
	return pack(result)

static func multiply(a: Variant, b: Variant) -> String:
	var left := digits(a)
	var right := digits(b)
	var output: Array[int] = []
	output.resize(left.length() + right.length())
	output.fill(0)
	for i in range(left.length() - 1, -1, -1):
		for j in range(right.length() - 1, -1, -1):
			output[i + j + 1] += (left.unicode_at(i) - 48) * (right.unicode_at(j) - 48)
	for i in range(output.size() - 1, 0, -1):
		output[i - 1] += output[i] / 10
		output[i] %= 10
	var result := ""
	for value in output:
		if not result.is_empty() or value != 0:
			result += str(value)
	return "0" if result.is_empty() else result

static func power(value: Variant, exponent: int) -> String:
	var result := "1"
	for _i in exponent:
		result = multiply(result, value)
	return result

static func half(value: Variant) -> Variant:
	var source := digits(value)
	var result := ""
	var remainder := 0
	for i in source.length():
		var digit := remainder * 10 + source.unicode_at(i) - 48
		result += str(digit / 2)
		remainder = digit % 2
	while result.length() > 1 and result[0] == "0":
		result = result.substr(1)
	return pack(result)

static func floor_root_ratio(numerator: String, denominator: String, degree: int, estimate: float) -> Variant:
	# Floating point only seeds an upper bound; exact integer comparisons decide the price.
	var low: Variant = 0
	var high: Variant = pack("%.0f" % maxf(2.0, ceil(estimate) * 2.0))
	while compare(multiply(power(high, degree), denominator), numerator) <= 0:
		high = add(high, high)
	while compare(subtract(high, low), 1) > 0:
		var middle: Variant = half(add(low, high))
		if compare(multiply(power(middle, degree), denominator), numerator) <= 0:
			low = middle
		else:
			high = middle
	return low

static func polynomial_cost(base: int, index: int, denominator: int) -> Variant:
	var factor := str(denominator + 3 * index)
	var numerator := multiply(power(base / 10, 5), power(factor, 8))
	var divisor := power(denominator, 8)
	var estimate := float(base) / 10.0 * pow(1.0 + 3.0 * index / denominator, 1.6)
	var units: Variant = floor_root_ratio(numerator, divisor, 5, estimate)
	if compare(multiply(power(units, 5), divisor), numerator) < 0:
		units = add(units, 1)
	return pack(multiply(units, 10))

static func refinement_bonus(recovered: int, level: int) -> Variant:
	var numerator := multiply(power(str(recovered * 3), 2), str(level))
	return floor_root_ratio(numerator, "2500", 2, recovered * 0.06 * sqrt(float(level)))

static func text(value: Variant) -> String:
	var source := digits(value)
	var result := ""
	for i in source.length():
		if i > 0 and (source.length() - i) % 3 == 0:
			result += ","
		result += source[i]
	return result

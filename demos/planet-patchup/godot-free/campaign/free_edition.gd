extends RefCounted

const ID := "free-web"
const BALANCE_VERSION := "free-final-collection-v1"
const SKILL_IDS := ["aftershock", "relay", "orbital"]
const MAP_IDS := ["arch-0-arch-quarter-v2", "arch-1-arch-quarter-v2", "arch-2-arch-quarter-v2", "arch-3-arch-quarter-v2", "arch-4-arch-quarter-v2", "arch-5-arch-quarter-v2", "arch-6-arch-quarter-v2", "arch-7-arch-quarter-v2"]

static func allows_region(index: int) -> bool:
	return index == 0

static func allows_site(id: String) -> bool:
	return id in MAP_IDS

static func allows_skill(id: String) -> bool:
	return id in SKILL_IDS

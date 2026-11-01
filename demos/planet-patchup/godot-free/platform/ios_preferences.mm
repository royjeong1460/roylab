// Read-only adapter for a future update signed with the original paid bundle ID.
// The independent godotcompare app cannot access the original application's defaults.
#import <Foundation/Foundation.h>
#include <stdlib.h>
#include <string.h>

extern "C" char *planet_patchup_copy_legacy_profile_slots_json(void) {
    @autoreleasepool {
        NSArray<NSString *> *keys = @[
            @"CapacitorStorage.planet-patchup-paid-v1:pixel-demolition-arch-v2-a",
            @"CapacitorStorage.planet-patchup-paid-v1:pixel-demolition-arch-v2-b"
        ];
        NSMutableDictionary<NSString *, NSString *> *slots = [NSMutableDictionary dictionary];
        NSUserDefaults *defaults = NSUserDefaults.standardUserDefaults;
        for (NSString *key in keys) {
            id value = [defaults objectForKey:key];
            if ([value isKindOfClass:NSString.class]) {
                slots[key] = value;
            } else if (value != nil) {
                // Preserve a type mismatch as invalid input instead of silently starting fresh.
                slots[key] = @"{invalid-preferences-type}";
            }
        }
        NSError *error = nil;
        NSData *data = [NSJSONSerialization dataWithJSONObject:slots options:NSJSONWritingSortedKeys error:&error];
        if (error != nil || data == nil) return NULL;
        char *result = (char *)malloc(data.length + 1);
        if (result == NULL) return NULL;
        memcpy(result, data.bytes, data.length);
        result[data.length] = '\0';
        return result;
    }
}

extern "C" void planet_patchup_free_legacy_profile_json(char *value) {
    free(value);
}

#include <stdio.h>

int main() {
    int value = 42;
    int *ptr = &value;

    printf("Value: %d\n", value);
    printf("Dereferenced: %d\n", *ptr);

    *ptr = 100;
    printf("New value: %d\n", value);
    return 0;
}

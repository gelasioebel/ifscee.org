#include <stdio.h>

int main() {
    int i;
    int sum = 0;

    for (i = 1; i <= 5; i = i + 1) {
        sum = sum + i;
        printf("i=%d, sum=%d\n", i, sum);
    }
    printf("Final sum: %d\n", sum);
    return 0;
}

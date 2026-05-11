#include <stdio.h>

int main() {
    int numbers[5];
    int i;

    numbers[0] = 10;
    numbers[1] = 20;
    numbers[2] = 30;
    numbers[3] = 40;
    numbers[4] = 50;

    for (i = 0; i < 5; i = i + 1) {
        printf("numbers[%d] = %d\n", i, numbers[i]);
    }
    return 0;
}

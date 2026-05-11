#include <stdio.h>

int main() {
    int countdown = 5;

    while (countdown > 0) {
        printf("Countdown: %d\n", countdown);
        countdown = countdown - 1;
    }
    printf("Liftoff!\n");
    return 0;
}

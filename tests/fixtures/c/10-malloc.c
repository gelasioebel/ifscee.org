#include <stdio.h>
#include <stdlib.h>

int main() {
    int *arr = (int*)malloc(3 * sizeof(int));

    arr[0] = 5;
    arr[1] = 10;
    arr[2] = 15;

    printf("arr[0] = %d\n", arr[0]);
    printf("arr[1] = %d\n", arr[1]);
    printf("arr[2] = %d\n", arr[2]);

    free(arr);
    return 0;
}

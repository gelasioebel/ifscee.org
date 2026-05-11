#include <stdio.h>

typedef struct {
    int x;
    int y;
} Point;

int distSquared(Point a, Point b) {
    int dx = a.x - b.x;
    int dy = a.y - b.y;
    return dx * dx + dy * dy;
}

int main() {
    Point p1;
    p1.x = 3;
    p1.y = 4;

    Point p2;
    p2.x = 7;
    p2.y = 1;

    printf("P1 = (%d, %d)\n", p1.x, p1.y);
    printf("P2 = (%d, %d)\n", p2.x, p2.y);
    printf("DistSquared = %d\n", distSquared(p1, p2));
    return 0;
}

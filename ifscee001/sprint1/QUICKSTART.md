# IFSCee - Quick Start Guide

## 🚀 Getting Started in 60 Seconds

### 1. Open the Project
Simply open `index.html` in your browser (no server needed!).

### 2. Try the Default Example
The editor comes with a sample program. Click **"Preparar Execução"** (or press **Ctrl+Enter**).

### 3. Step Through Execution
- Click **"Próximo >"** (or press **→**) to execute line by line
- Watch the memory panel update in real-time
- See the output in the terminal panel

## 🎯 Quick Features Tour

### Auto-Play Mode
1. Click **"Preparar Execução"**
2. Click **"▶ Play"** (or press **Space**)
3. Adjust speed with the slider (1x to 10x)
4. Press **Space** again to pause

### Watch Variables
1. **Right-click** any variable in the memory panel
2. See it appear in the "Variáveis Observadas" panel
3. Watch its value update during execution
4. Click **✕** to remove from watch list

### Navigation Controls
- **← →** : Navigate through execution history
- **Home** : Jump to first step
- **End** : Run to completion
- **Space** : Toggle auto-play
- **Esc** : Return to edit mode

## 📝 Try These Examples

### Example 1: Simple Variables
```c
#include <stdio.h>

int main() {
    int x = 10;
    int y = 20;
    int soma = x + y;
    printf("Resultado: %d\n", soma);
    return 0;
}
```

### Example 2: Arrays
```c
#include <stdio.h>

int main() {
    int numeros[5];
    numeros[0] = 100;
    numeros[4] = 200;
    printf("Primeiro: %d, Último: %d\n", numeros[0], numeros[4]);
    return 0;
}
```

### Example 3: Pointers
```c
#include <stdio.h>

int main() {
    int valor = 42;
    int *ptr = &valor;
    printf("Valor: %d\n", *ptr);
    *ptr = 100;
    printf("Novo valor: %d\n", valor);
    return 0;
}
```

### Example 4: Recursion
```c
#include <stdio.h>

int fatorial(int n) {
    if (n <= 1) return 1;
    return n * fatorial(n - 1);
}

int main() {
    int result = fatorial(5);
    printf("Fatorial de 5 = %d\n", result);
    return 0;
}
```

### Example 5: Matrix
```c
#include <stdio.h>

int main() {
    int matriz[3][3];
    matriz[0][0] = 1;
    matriz[1][1] = 5;
    matriz[2][2] = 9;
    printf("Diagonal principal: %d, %d, %d\n",
           matriz[0][0], matriz[1][1], matriz[2][2]);
    return 0;
}
```

### Example 6: Dynamic Memory
```c
#include <stdio.h>

int main() {
    int *ptr = malloc(10);
    *ptr = 42;
    printf("Valor alocado: %d\n", *ptr);
    free(ptr);
    return 0;
}
```

## 🔍 Understanding the UI

### Left Panel: Code Editor
- Dark theme with syntax highlighting
- Keywords in **purple**
- Types in **yellow**
- Functions in **blue**
- Strings in **green**

### Right Panels (Top to Bottom):

#### 1. Estado da Memória RAM
Shows all allocated variables:
- 🟢 **STACK**: Local variables and function parameters
- 🟠 **HEAP**: Dynamically allocated memory (malloc)
- 🟣 **RODATA**: String literals and constants

#### 2. Variáveis Observadas
Your watched variables appear here with live values.

#### 3. Saída do Programa
Terminal output from `printf` statements.

## 💡 Pro Tips

### 1. Debug Errors Easily
When you get an error:
- Read the full error message (now with helpful hints!)
- Check the suggested variables or fixes
- Use the line highlighting to find the problem

### 2. Learn Pointers Visually
```c
int x = 10;
int *p = &x;  // Right-click both 'x' and 'p' to watch them
*p = 20;      // See how changing *p affects x
```

### 3. Understand Array Layout
```c
int arr[2][3];  // Create a matrix
arr[0][0] = 1;  // Watch how it's stored linearly in memory
arr[1][2] = 9;
```

### 4. Track Recursion
```c
int fibonacci(int n) {
    if (n <= 1) return n;
    return fibonacci(n-1) + fibonacci(n-2);
}
// Use slow speed (1-2x) to watch the call stack
```

### 5. Find Memory Leaks
```c
int *p = malloc(100);
*p = 42;
// Forget to call free(p) - see it stay in HEAP!
```

## 🐛 Common Issues

### "Variável não declarada"
```c
// ❌ Wrong
int main() {
    x = 10;  // Error: 'x' not declared
}

// ✅ Correct
int main() {
    int x = 10;
}
```

### "Array Out of Bounds"
```c
// ❌ Wrong
int arr[5];
arr[5] = 10;  // Error: valid indices are 0-4

// ✅ Correct
int arr[5];
arr[4] = 10;  // Last valid index
```

### "Null Pointer Dereference"
```c
// ❌ Wrong
int *ptr;
*ptr = 10;  // Error: ptr not initialized

// ✅ Correct
int *ptr = malloc(4);
*ptr = 10;
free(ptr);
```

## 🎓 Learning Path

### Beginner
1. Variables and printf
2. If/else statements
3. Loops (for, while)
4. Arrays

### Intermediate
5. Functions
6. Pointers
7. Dynamic memory
8. Recursion

### Advanced
9. Multidimensional arrays
10. Pointer arithmetic
11. Complex data structures

## 📚 Need More Help?

- Check `README.md` for full documentation
- See `CHANGELOG.md` for all features
- Review the `improvements.txt` for roadmap

## 🎯 Best Practices

1. **Start Simple**: Begin with basic examples
2. **Use Watch Panel**: Track important variables
3. **Adjust Speed**: Slow down for complex code
4. **Read Errors**: Error messages now have helpful tips!
5. **Experiment**: Try breaking things to learn

## ⌨️ Keyboard Shortcuts Cheat Sheet

| Action | Shortcut |
|--------|----------|
| Prepare | Ctrl + Enter |
| Play/Pause | Space |
| Next Step | → |
| Previous Step | ← |
| First Step | Home |
| Last Step | End |
| Edit Mode | Esc |

---

**Happy Coding!** 🚀 If you encounter any issues or have questions, the error messages will guide you with helpful tips and suggestions.

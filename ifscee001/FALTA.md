# O Que Falta para Compatibilidade Completa com C99

Este documento lista **TUDO** que ainda não está implementado no IFSCee para alcançar compatibilidade completa com o padrão C99 (ISO/IEC 9899:1999).

---

## 📊 Status Atual

### ✅ O Que JÁ Funciona (Implementado)

#### Tipos de Dados Básicos
- ✅ `int`, `char`, `void`, `float`, `double`
- ✅ `short`, `long`, `unsigned`, `signed`
- ✅ `_Bool` (C99)
- ✅ Ponteiros simples (`int*`, `char*`, etc.)
- ✅ Arrays unidimensionais (`int arr[10]`)
- ✅ Arrays multidimensionais (`int matrix[3][4]`)
- ✅ Qualificadores: `const`, `static`, `extern`, `volatile`

#### Operadores
- ✅ Aritméticos: `+`, `-`, `*`, `/`
- ✅ Comparação: `==`, `!=`, `<`, `>`, `<=`, `>=`
- ✅ Lógicos: `&&`, `||`, `!`
- ✅ Atribuição: `=`, `+=`, `-=`, `*=`, `/=`
- ✅ Incremento/Decremento: `++`, `--` (prefixo e sufixo)
- ✅ Ponteiros: `&` (endereço), `*` (desreferência)
- ✅ Especial: `sizeof`

#### Controle de Fluxo
- ✅ `if` / `else` / `else if`
- ✅ `while`
- ✅ `do-while`
- ✅ `for` (com init, condition, increment)
- ✅ `break`
- ✅ `continue`
- ✅ `return`

#### Funções
- ✅ Declaração e definição
- ✅ Parâmetros por valor
- ✅ Parâmetros por referência (ponteiros)
- ✅ Recursão (com stack overflow detection)
- ✅ Built-ins: `printf`, `malloc`, `free`

#### Preprocessador
- ✅ `#include` (mock)
- ✅ `#define` (macros simples e com parâmetros)
- ✅ `#ifdef`, `#ifndef`, `#else`, `#endif`

#### Recursos Avançados
- ✅ Strings literais (RODATA)
- ✅ Type casting explícito
- ✅ Alocação dinâmica (heap)
- ✅ Escopo de variáveis
- ✅ Stack frames
- ✅ Caracteres literais (`'A'` → ASCII)

---

## ❌ O Que FALTA Implementar

### 🔴 **CRÍTICO** - Essencial para C99

#### 1. Operadores Bitwise
**Status**: ❌ Não Implementado
**Impacto**: Alto - Muito usado em sistemas embarcados e drivers
**Complexidade**: Média

**Operadores Faltantes**:
```c
&   // AND bitwise       (ex: 0b1010 & 0b1100 = 0b1000)
|   // OR bitwise        (ex: 0b1010 | 0b0101 = 0b1111)
^   // XOR bitwise       (ex: 0b1010 ^ 0b1100 = 0b0110)
~   // NOT bitwise       (ex: ~0b1010 = 0b0101)
<<  // Left shift        (ex: 5 << 2 = 20)
>>  // Right shift       (ex: 20 >> 2 = 5)
```

**Onde adicionar**:
- `lexer.js`: Adicionar tokens para `&`, `|`, `^`, `~`, `<<`, `>>`
- `parser.js`: Adicionar precedência (shift > relational)
- `interpreter.js`: Implementar operações bit a bit em `visitBinary`

**Exemplos de Uso**:
```c
int flags = 0x0F;           // 0000 1111
flags = flags | 0x10;       // 0001 1111 (set bit)
flags = flags & ~0x08;      // 0001 0111 (clear bit)
int shifted = flags << 2;   // 0101 1100 (multiply by 4)
```

**Teste Necessário**:
```c
int test_bitwise() {
    int a = 0b1100;  // 12
    int b = 0b1010;  // 10

    int and_result = a & b;   // esperado: 8 (0b1000)
    int or_result = a | b;    // esperado: 14 (0b1110)
    int xor_result = a ^ b;   // esperado: 6 (0b0110)
    int not_result = ~a;      // esperado: -13 (complemento de 2)
    int left = a << 1;        // esperado: 24
    int right = a >> 1;       // esperado: 6

    return and_result + or_result + xor_result;
}
```

---

#### 2. Operador Ternário (Conditional Operator)
**Status**: ❌ Não Implementado
**Impacto**: Médio - Comum em código conciso
**Complexidade**: Baixa

**Sintaxe**:
```c
condition ? value_if_true : value_if_false
```

**Onde adicionar**:
- `parser.js`: Novo tipo de nó `ConditionalExpression`
- `parser.js`: Parsing em `parseExpression()` com precedência baixa
- `interpreter.js`: `visitConditional()`

**Exemplos**:
```c
int max = (a > b) ? a : b;
int signal = (x >= 0) ? 1 : -1;
printf(x > 0 ? "Positive" : "Negative");
```

**Teste**:
```c
int a = 10, b = 20;
int max = (a > b) ? a : b;  // esperado: 20
int nested = (a > 5) ? ((b > 15) ? b : a) : 0;  // esperado: 20
```

---

#### 3. Switch/Case/Default
**Status**: ❌ Não Implementado
**Impacto**: Alto - Usado em state machines e menu systems
**Complexidade**: Alta

**Sintaxe Completa**:
```c
switch (expression) {
    case constant1:
        // statements
        break;
    case constant2:
    case constant3:  // fall-through
        // statements
        break;
    default:
        // statements
}
```

**Onde adicionar**:
- `parser.js`: Novos nós: `SwitchStatement`, `CaseClause`, `DefaultClause`
- `parser.js`: `parseSwitchStatement()` com parsing de múltiplos cases
- `interpreter.js`: `visitSwitch()` com lógica de fall-through
- Suporte a `break` dentro de switch (diferente de loops)

**Características C99**:
- ✅ Expressão pode ser qualquer tipo inteiro
- ✅ Fall-through (executa próximo case se não houver break)
- ✅ Default pode estar em qualquer posição
- ✅ Cases podem ser duplicados (erro de compilação)

**Exemplo Complexo**:
```c
int classify_char(char c) {
    switch(c) {
        case 'a':
        case 'e':
        case 'i':
        case 'o':
        case 'u':
            return 1;  // vogal
        case ' ':
        case '\t':
        case '\n':
            return 2;  // espaço
        default:
            return 0;  // outro
    }
}
```

**Fall-through Intencional**:
```c
switch(day) {
    case 1:
    case 2:
    case 3:
    case 4:
    case 5:
        printf("Weekday");
        break;
    case 6:
    case 7:
        printf("Weekend");
        break;
}
```

---

#### 4. Operador Vírgula (Comma Operator)
**Status**: ❌ Não Implementado
**Impacto**: Baixo - Usado principalmente em for loops
**Complexidade**: Baixa

**Sintaxe**:
```c
expr1, expr2, expr3  // Avalia todas, retorna a última
```

**Uso Principal**:
```c
for (i = 0, j = 10; i < j; i++, j--) {
    // Incrementa i e decrementa j simultaneamente
}

int x = (a = 1, b = 2, a + b);  // x = 3
```

**Onde adicionar**:
- `parser.js`: `parseCommaExpression()` com precedência mais baixa
- `interpreter.js`: Avaliar sequencialmente, retornar último

---

#### 5. Operadores de Atribuição Bitwise
**Status**: ❌ Não Implementado
**Impacto**: Médio
**Complexidade**: Baixa (após bitwise básico)

```c
&=   // x &= y  →  x = x & y
|=   // x |= y  →  x = x | y
^=   // x ^= y  →  x = x ^ y
<<= // x <<= 2 →  x = x << 2
>>= // x >>= 2 →  x = x >> 2
```

---

#### 6. Operador Módulo (%)
**Status**: ❌ Não Implementado
**Impacto**: Médio - Essencial para muitos algoritmos
**Complexidade**: Trivial

```c
int resto = 10 % 3;  // 1
int par = (x % 2 == 0);  // verifica se é par
```

**Onde adicionar**:
- `lexer.js`: Token para `%`
- `parser.js`: Adicionar em `parseMultiplicative()`
- `interpreter.js`: `case '%': return l % r;`

**Teste**:
```c
// Encontrar números primos
int is_prime(int n) {
    if (n <= 1) return 0;
    for (int i = 2; i * i <= n; i++) {
        if (n % i == 0) return 0;
    }
    return 1;
}
```

---

### 🟠 **IMPORTANTE** - Comum em C99

#### 7. Structs (Estruturas)
**Status**: ❌ Não Implementado
**Impacto**: MUITO Alto - Fundamental para organização de dados
**Complexidade**: Alta

**Sintaxe Completa**:
```c
// Declaração
struct Point {
    int x;
    int y;
};

// Uso
struct Point p1;
p1.x = 10;
p1.y = 20;

// Ponteiros para struct
struct Point* ptr = &p1;
ptr->x = 30;  // Notação de seta

// Typedef
typedef struct {
    float r, g, b;
} Color;

Color red;
red.r = 1.0;
```

**O Que Implementar**:

1. **Parsing**:
   - `struct` keyword
   - Declaração de membros
   - Nested structs
   - Anonymous structs

2. **Memory Layout**:
   - Calcular tamanho total
   - Offset de cada membro
   - Padding e alinhamento

3. **Operadores**:
   - `.` (dot) para acesso direto
   - `->` (arrow) para acesso via ponteiro
   - Atribuição de struct inteira

4. **Type System**:
   - `sizeof(struct)` correto
   - Type checking

**Exemplo Completo**:
```c
struct Student {
    char name[50];
    int age;
    float grade;
};

struct Student alice;
alice.age = 20;
alice.grade = 9.5;

struct Student* ptr = &alice;
ptr->age = 21;

// Array de structs
struct Student turma[30];
turma[0].age = 18;
```

**Desafios**:
- Memory alignment (padding entre membros)
- Structs aninhadas
- Arrays dentro de structs
- Structs passadas como parâmetros

---

#### 8. Unions
**Status**: ❌ Não Implementado
**Impacto**: Médio - Usado para memory overlays
**Complexidade**: Média

**Sintaxe**:
```c
union Data {
    int i;
    float f;
    char str[20];
};

union Data data;
data.i = 10;        // Usa como int
printf("%d", data.i);
data.f = 220.5;     // Sobrescreve, usa como float
printf("%f", data.f);
```

**Características**:
- Todos os membros compartilham o mesmo espaço de memória
- Tamanho = maior membro
- Usado para type punning e economia de memória

**Uso Real**:
```c
// Converter float para bytes
union FloatBytes {
    float f;
    unsigned char bytes[4];
};

union FloatBytes fb;
fb.f = 3.14;
// Agora pode acessar bytes individuais: fb.bytes[0], fb.bytes[1]...
```

---

#### 9. Enums (Enumerações)
**Status**: ❌ Não Implementado
**Impacto**: Médio - Melhora legibilidade
**Complexidade**: Baixa

**Sintaxe**:
```c
enum Color { RED, GREEN, BLUE };  // RED=0, GREEN=1, BLUE=2

enum Status {
    OK = 200,
    NOT_FOUND = 404,
    ERROR = 500
};

enum Color c = RED;
if (c == GREEN) { ... }
```

**Características C99**:
- Valores podem ser explícitos ou automáticos
- Type checking fraco (são apenas ints)
- Scoped dentro do enum

**Exemplo**:
```c
enum Day {
    MONDAY = 1,
    TUESDAY,
    WEDNESDAY,
    THURSDAY,
    FRIDAY,
    SATURDAY,
    SUNDAY
};

enum Day today = WEDNESDAY;  // 3
```

---

#### 10. Typedef
**Status**: ❌ Não Implementado
**Impacto**: Alto - Essencial para código legível
**Complexidade**: Média

**Sintaxe**:
```c
typedef int Integer;
typedef char* String;
typedef struct Point Point;  // Agora pode usar Point ao invés de struct Point

typedef struct {
    int x, y;
} Coordinate;  // Struct anônima com typedef
```

**Usos Comuns**:
```c
typedef unsigned long size_t;
typedef unsigned char uint8_t;

typedef int (*Callback)(int, int);  // Ponteiro para função
```

---

#### 11. Ponteiros para Funções
**Status**: ❌ Não Implementado
**Impacto**: Médio - Usado em callbacks e dispatch tables
**Complexidade**: Alta

**Sintaxe**:
```c
// Declaração
int (*func_ptr)(int, int);

// Atribuição
int add(int a, int b) { return a + b; }
func_ptr = &add;  // ou apenas: func_ptr = add;

// Chamada
int result = func_ptr(5, 3);  // ou: (*func_ptr)(5, 3);
```

**Exemplo Complexo**:
```c
typedef int (*Operation)(int, int);

int apply(Operation op, int a, int b) {
    return op(a, b);
}

int multiply(int a, int b) { return a * b; }
int divide(int a, int b) { return a / b; }

int result1 = apply(multiply, 10, 5);  // 50
int result2 = apply(divide, 10, 5);    // 2
```

**Array de Ponteiros para Funções**:
```c
int (*operations[4])(int, int) = {add, subtract, multiply, divide};
int result = operations[2](10, 5);  // multiply
```

---

#### 12. Operador de Membro (. e ->)
**Status**: ❌ Parcial (precisa structs)
**Impacto**: Crítico para structs
**Complexidade**: Média

```c
struct Point p = {10, 20};
int x = p.x;  // Acesso direto

struct Point* ptr = &p;
int y = ptr->y;  // Equivalente a: (*ptr).y
```

---

### 🟡 **DESEJÁVEL** - Menos Comum mas Útil

#### 13. Variadic Functions (stdarg.h)
**Status**: ❌ Não Implementado
**Impacto**: Baixo - Usado em funções como printf/scanf
**Complexidade**: Alta

**Sintaxe**:
```c
#include <stdarg.h>

int sum(int count, ...) {
    va_list args;
    va_start(args, count);

    int total = 0;
    for (int i = 0; i < count; i++) {
        total += va_arg(args, int);
    }

    va_end(args);
    return total;
}

int result = sum(3, 10, 20, 30);  // 60
```

**Macros Necessárias**:
- `va_list` - tipo
- `va_start` - inicializa
- `va_arg` - pega próximo argumento
- `va_end` - finaliza

---

#### 14. Inicializadores Designados (C99)
**Status**: ❌ Não Implementado
**Impacto**: Baixo - Conveniência
**Complexidade**: Média

**Arrays**:
```c
int arr[10] = { [0] = 1, [5] = 100, [9] = 999 };
// Resto fica com zero
```

**Structs**:
```c
struct Point p = { .x = 10, .y = 20 };
struct Point p2 = { .y = 5 };  // .x fica zero
```

---

#### 15. Arrays de Tamanho Variável (VLA - Variable Length Arrays)
**Status**: ❌ Não Implementado
**Impacto**: Baixo - C99 feature opcional
**Complexidade**: Alta

```c
int n = 5;
int arr[n];  // Tamanho definido em runtime!

void process(int size) {
    int buffer[size];  // VLA na stack
    // ...
}
```

**Desafios**:
- Alocação dinâmica na stack
- Impossível determinar tamanho em compile-time
- Questões de segurança (stack overflow)

---

#### 16. Inline Functions
**Status**: ❌ Não Implementado
**Impacto**: Muito Baixo - Otimização
**Complexidade**: Alta (requer análise de código)

```c
inline int max(int a, int b) {
    return (a > b) ? a : b;
}
```

---

#### 17. Funções Static Inline
**Status**: ❌ Não Implementado
**Impacto**: Muito Baixo
**Complexidade**: Alta

```c
static inline int helper(int x) {
    return x * 2;
}
```

---

#### 18. Restrict Keyword (C99)
**Status**: ❌ Não Implementado
**Impacto**: Muito Baixo - Apenas otimização
**Complexidade**: Alta

```c
void process(int* restrict a, int* restrict b) {
    // Compilador assume que a e b não fazem alias
}
```

---

### 🔵 **BIBLIOTECA PADRÃO** - Funções Built-in

#### 19. String Functions (string.h)
**Status**: ❌ Não Implementado
**Impacto**: Alto - Muito usado

**Funções Essenciais**:
```c
// Implementar como built-ins

strlen(s)           // Retorna comprimento
strcpy(dest, src)   // Copia string
strcat(dest, src)   // Concatena
strcmp(s1, s2)      // Compara (retorna 0 se iguais)
strchr(s, c)        // Encontra caractere
strstr(s, sub)      // Encontra substring
```

**Exemplo**:
```c
char str1[50] = "Hello";
char str2[] = " World";

int len = strlen(str1);         // 5
strcat(str1, str2);             // "Hello World"
int cmp = strcmp(str1, "Hi");   // != 0
```

---

#### 20. Math Functions (math.h)
**Status**: ❌ Não Implementado
**Impacto**: Médio

```c
double sqrt(double x)
double pow(double base, double exp)
double sin(double x)
double cos(double x)
double tan(double x)
double log(double x)
double exp(double x)
double fabs(double x)
double ceil(double x)
double floor(double x)
```

---

#### 21. Character Functions (ctype.h)
**Status**: ❌ Não Implementado
**Impacto**: Médio

```c
int isalpha(int c)   // É letra?
int isdigit(int c)   // É dígito?
int isalnum(int c)   // É alfanumérico?
int isspace(int c)   // É espaço?
int isupper(int c)   // É maiúscula?
int islower(int c)   // É minúscula?
int toupper(int c)   // Converte para maiúscula
int tolower(int c)   // Converte para minúscula
```

---

#### 22. Memory Functions (stdlib.h)
**Status**: ⚠️ Parcial (`malloc` e `free` implementados)
**Impacto**: Médio

**Faltam**:
```c
void* calloc(size_t num, size_t size)  // malloc + zera memória
void* realloc(void* ptr, size_t size)  // Redimensiona bloco
```

---

#### 23. Input/Output (stdio.h)
**Status**: ⚠️ Parcial (`printf` implementado)
**Impacto**: Alto

**Faltam**:
```c
int scanf(const char* format, ...)     // Leitura formatada
int sprintf(char* str, const char* fmt, ...)  // Printf para string
int sscanf(const char* str, const char* fmt, ...)  // Scanf de string
int getchar(void)                      // Lê caractere
int putchar(int c)                     // Escreve caractere
char* gets(char* str)                  // Lê linha
int puts(const char* str)              // Escreve linha
```

---

#### 24. Conversão (stdlib.h)
**Status**: ❌ Não Implementado
**Impacto**: Médio

```c
int atoi(const char* str)              // String para int
long atol(const char* str)             // String para long
double atof(const char* str)           // String para double
char* itoa(int value, char* str, int base)  // Int para string
```

---

#### 25. Outras Funções Úteis
**Status**: ❌ Não Implementado

```c
// stdlib.h
void exit(int status)
int abs(int x)
int rand(void)
void srand(unsigned int seed)

// time.h
time_t time(time_t* timer)

// assert.h
void assert(int expression)
```

---

### 🟣 **AVANÇADO** - Recursos C99 Específicos

#### 26. Complex Numbers (complex.h)
**Status**: ❌ Não Implementado
**Impacto**: Muito Baixo - Nicho
**Complexidade**: Alta

```c
#include <complex.h>

double complex z = 1.0 + 2.0 * I;
double real_part = creal(z);
double imag_part = cimag(z);
```

---

#### 27. Boolean Type (stdbool.h)
**Status**: ⚠️ Parcial (`_Bool` existe)
**Impacto**: Baixo

**Falta Adicionar**:
```c
// Em preprocessador
#define bool _Bool
#define true 1
#define false 0
```

---

#### 28. Integer Types Fixos (stdint.h)
**Status**: ❌ Não Implementado
**Impacto**: Médio - Portabilidade

```c
typedef signed char int8_t;
typedef short int16_t;
typedef int int32_t;
typedef long long int64_t;

typedef unsigned char uint8_t;
typedef unsigned short uint16_t;
typedef unsigned int uint32_t;
typedef unsigned long long uint64_t;
```

---

#### 29. Printf Aprimorado
**Status**: ⚠️ Parcial
**Impacto**: Médio

**Especificadores Faltantes**:
```c
%u   // unsigned int
%x   // hexadecimal minúsculo
%X   // hexadecimal maiúsculo
%o   // octal
%e   // notação científica
%g   // escolhe entre %f e %e
%n   // escreve número de caracteres printados
%%   // literal %
```

**Width e Precision**:
```c
printf("%5d", 42);      // "   42"
printf("%-5d", 42);     // "42   "
printf("%05d", 42);     // "00042"
printf("%.2f", 3.14159);  // "3.14"
printf("%*d", 5, 42);   // largura variável
```

---

#### 30. Literais Hexadecimais e Octais
**Status**: ❌ Não Implementado
**Impacto**: Médio

```c
int hex = 0xFF;        // 255
int oct = 0755;        // 493
int bin = 0b1010;      // 10 (extensão GCC, não C99)
```

**Onde adicionar**:
- `lexer.js`: `readNumber()` detectar prefixo `0x` e `0`

---

#### 31. Escape Sequences Completos
**Status**: ⚠️ Parcial (`\n`, `\0` implementados)
**Impacto**: Baixo

**Faltam**:
```c
\a   // Bell (alert)
\b   // Backspace
\f   // Form feed
\r   // Carriage return
\t   // Tab horizontal
\v   // Tab vertical
\\   // Backslash
\"   // Aspas duplas
\'   // Aspas simples
\?   // Question mark
\xHH // Hex (ex: \x41 = 'A')
\ooo // Octal (ex: \101 = 'A')
```

---

#### 32. Long Long Type (C99)
**Status**: ❌ Não Implementado
**Impacto**: Baixo

```c
long long big_number = 9223372036854775807LL;
unsigned long long huge = 18446744073709551615ULL;
```

---

#### 33. Declarações Mistas (C99)
**Status**: ✅ Implementado (for loop permite)
**Impacto**: N/A

```c
int x = 5;
printf("%d", x);
int y = 10;  // OK em C99, erro em C89
```

---

#### 34. Comentários de Linha Única
**Status**: ✅ Implementado
**Impacto**: N/A

```c
// Este estilo já funciona
```

---

#### 35. Flexible Array Members (C99)
**Status**: ❌ Não Implementado (requer structs)
**Impacto**: Muito Baixo

```c
struct Buffer {
    int size;
    char data[];  // Último membro pode ser array sem tamanho
};
```

---

## 📊 Tabela Resumo de Prioridades

| Prioridade | Feature | Impacto | Complexidade | Esforço |
|------------|---------|---------|--------------|---------|
| 🔴 CRÍTICO | Bitwise Operators | Alto | Média | 2-3 dias |
| 🔴 CRÍTICO | Switch/Case | Alto | Alta | 3-5 dias |
| 🔴 CRÍTICO | Operador % (módulo) | Médio | Trivial | 1 hora |
| 🔴 CRÍTICO | Operador Ternário | Médio | Baixa | 1 dia |
| 🟠 IMPORTANTE | Structs | MUITO Alto | Alta | 5-7 dias |
| 🟠 IMPORTANTE | Typedef | Alto | Média | 2-3 dias |
| 🟠 IMPORTANTE | String Functions | Alto | Média | 3-4 dias |
| 🟠 IMPORTANTE | Enums | Médio | Baixa | 1-2 dias |
| 🟠 IMPORTANTE | Unions | Médio | Média | 2-3 dias |
| 🟡 DESEJÁVEL | Ponteiros para Funções | Médio | Alta | 4-5 dias |
| 🟡 DESEJÁVEL | Math Functions | Médio | Média | 2-3 dias |
| 🟡 DESEJÁVEL | Scanf | Médio | Alta | 3-4 dias |
| 🟡 DESEJÁVEL | Operador Vírgula | Baixo | Baixa | 1 dia |
| 🔵 AVANÇADO | Variadic Functions | Baixo | Alta | 4-5 dias |
| 🔵 AVANÇADO | VLA | Baixo | Alta | 3-4 dias |
| 🔵 AVANÇADO | Inicializadores Designados | Baixo | Média | 2-3 dias |

---

## 🎯 Roadmap Sugerido

### Fase 1: Operadores Essenciais (1-2 semanas)
1. ✅ Operador % (módulo) - 1h
2. ✅ Operador ternário (?:) - 1 dia
3. ✅ Operadores bitwise (&, |, ^, ~, <<, >>) - 2-3 dias
4. ✅ Operadores de atribuição bitwise (&=, |=, etc.) - 1 dia

### Fase 2: Controle de Fluxo (1 semana)
5. ✅ Switch/Case/Default com fall-through - 3-5 dias

### Fase 3: Tipos Compostos (2-3 semanas)
6. ✅ Structs (declaração, acesso, ponteiros) - 5-7 dias
7. ✅ Operadores . e -> - 2 dias
8. ✅ Typedef - 2-3 dias
9. ✅ Enums - 1-2 dias
10. ✅ Unions - 2-3 dias

### Fase 4: Biblioteca Padrão (1-2 semanas)
11. ✅ String functions (strlen, strcpy, etc.) - 3-4 dias
12. ✅ Math functions (sqrt, pow, etc.) - 2-3 dias
13. ✅ Character functions (isalpha, etc.) - 1-2 dias
14. ✅ Printf completo (todos os especificadores) - 2 dias

### Fase 5: Features Avançadas (2-3 semanas)
15. ✅ Ponteiros para funções - 4-5 dias
16. ✅ Literais hex/octal - 1 dia
17. ✅ Escape sequences completos - 1 dia
18. ✅ Scanf - 3-4 dias
19. ✅ Operador vírgula - 1 dia

### Fase 6: C99 Específico (1-2 semanas)
20. ✅ Boolean (stdbool.h) - 1 hora
21. ✅ Fixed-width integers (stdint.h) - 1 dia
22. ✅ Long long - 1 dia
23. ✅ Inicializadores designados - 2-3 dias

### Fase 7: Avançado (Opcional)
24. Variadic functions - 4-5 dias
25. VLA - 3-4 dias
26. Inline functions - difícil sem otimizador

---

## 🧪 Suite de Testes Completa

### Teste 1: Operadores Bitwise
```c
int test_bitwise() {
    int a = 0b1100;
    int b = 0b1010;
    assert((a & b) == 8);
    assert((a | b) == 14);
    assert((a ^ b) == 6);
    assert((a << 1) == 24);
    assert((a >> 1) == 6);
    assert((~a) == -13);
    return 1;
}
```

### Teste 2: Structs
```c
struct Point {
    int x;
    int y;
};

int test_structs() {
    struct Point p = {10, 20};
    assert(p.x == 10);
    assert(p.y == 20);

    struct Point* ptr = &p;
    ptr->x = 30;
    assert(p.x == 30);

    return 1;
}
```

### Teste 3: Switch/Case
```c
int test_switch(int n) {
    switch(n) {
        case 1:
            return 10;
        case 2:
        case 3:
            return 20;
        default:
            return 0;
    }
}
```

### Teste 4: String Functions
```c
int test_strings() {
    char s1[20] = "Hello";
    char s2[] = " World";

    assert(strlen(s1) == 5);
    strcat(s1, s2);
    assert(strcmp(s1, "Hello World") == 0);

    return 1;
}
```

---

## 📝 Notas de Implementação

### Dificuldades Esperadas

1. **Structs**: Maior desafio técnico
   - Memory layout complexo
   - Padding e alinhamento
   - Nested structs
   - Passagem por valor vs referência

2. **Switch/Case**: Lógica de fall-through
   - Label tracking
   - Break dentro de switch vs break de loop
   - Default em qualquer posição

3. **Ponteiros para Funções**: Type system complexo
   - Sintaxe confusa
   - Casting entre tipos de função
   - Vtables e dispatch

4. **Scanf**: Parsing reverso
   - Implementar parsing de format string
   - Escrever em ponteiros fornecidos
   - Validação de input

5. **Variadic Functions**: Stack manipulation
   - Acesso a argumentos variáveis
   - Type information não disponível

### Simplificações Aceitáveis

Para fins educacionais, podemos simplificar:

1. **Padding/Alinhamento**: Usar alinhamento simples (sem otimização)
2. **Inline**: Ignorar (não afeta semântica)
3. **Restrict**: Ignorar (apenas otimização)
4. **Volatile**: Implementação mínima
5. **Complex Numbers**: Opcional (nicho)

---

## 🎓 Impacto Educacional

### Com Structs e Switch
- ✅ 90% dos programas introdutórios funcionariam
- ✅ Projetos de estruturas de dados (listas, árvores)
- ✅ State machines
- ✅ Simulações básicas

### Com String/Math Functions
- ✅ 95% de exercícios acadêmicos
- ✅ Algoritmos de string
- ✅ Computação numérica básica

### Com Ponteiros para Funções
- ✅ 98% de código C99
- ✅ Callbacks e event handlers
- ✅ Plugins e módulos dinâmicos

---

## ✅ Conclusão

O IFSCee atual já cobre ~60% do C99 essencial. Para chegar a 90%:

**Must-Have** (6-8 semanas):
1. Operador % e ternário
2. Bitwise operators
3. Switch/Case
4. Structs com . e ->
5. Typedef
6. String functions

**Nice-to-Have** (4-6 semanas adicionais):
7. Enums e Unions
8. Math functions
9. Printf/Scanf completos
10. Ponteiros para funções

**Total para C99 completo**: ~12-16 semanas de desenvolvimento focado.

---

**Documento gerado em**: 2026-03-01
**Versão IFSCee**: 2.1.1
**Baseado em**: ISO/IEC 9899:1999 (C99)

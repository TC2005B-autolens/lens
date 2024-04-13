# lens

lens se encarga de calificar y analizar las entregas de tareas de código. Presenta un API para generar tareas, calificar entregas y obtener los resultados.

## Formatos JSON
Mediante un request de API (URL completo por decidir), se puede generar una tarea (lo cual lo hace el profesor), con una lista de pruebas a correr al código, archivos requeridos para la asignatura, etcétera.
### Asignatura
La asignatura contiene las siguientes propiedades:
1. ID - string
    - Este ID puede ser cualquier string.
    - En práctica, debería ser algo representando el tipo de asignatura o lo que se espera hacer. Por ejemplo, si en una tarea se pide hacer una función que calcula la ecuación cuadrática el ID podría ser `eq-quadratica`.
2. ID lenguaje - string
    - Este ID sería el mismo de la base de datos principal del proyecto, por ejemplo `python`, `cpp`, `javascript`, etc.
    - Determinará qué imagen de Docker se usará para correr el proyecto.
3. Archivos - Lista de objectos `Archivo`
    - Muchas tareas requieren de archivos extras para empezar. Por ejemplo, a veces el alumno debe empezar con una clase predeterminada, o se requiere un archivo de texto a leer o procesar, etc.
    - Objeto `Archivo`
        - Path - string (la ubicación del archivo en la estructura de folders)
        - Permisos - una bitflag representando si se puede leer y/o modificar por el alumno con código.
        - Contenido - string (el contenido del archivo)
4. Pruebas - lista de objetos `Prueba`
    - Una prueba es un conjunto de acciones, o pasos. Si todos los asserts dentro de una prueba se logran, esa prueba se considerará pasada.
    - Nombre - string (un nombre legible, a mostrarse en la interfaz)
    - Acciones - lista de tipo `Accion`
4. `Accion` - Acciones
    - Las acciones serán pasos individuales a correr con el programa. Similar a los unit tests, se puede hacer interfaz con el programa, sea llamando funciones, mandando texto a la consola mediante `stdin` o leyendo el `stdout`. Encadenando estas 'acciones' permitirá que las pruebas puedan ser muy personalizables.
    - `TipoAccion` - tipos de acciones
        - `stdin` - lens mandará el texto especificado al stdin.
        - `assert` - Una prueba. Existen varios tipos de assertions. Tenerlo como un tipo general nos ayuda a listar todas las pruebas en la interfaz y mostrarle al usuario qué pruebas fallaron.
    - `TipoAssert` - tipos de assert
        - `stdout` - se leerá una línea de stdout, y se comparará con una salida predeterminada.
        - `func` - se llamará una función del programa con los parámetros especificados y se comparará la salida con una especificada.
        - `process` - Se ejecutará un programa en la shell, y se verificará que el código de salida es `0`. Se puede usar para crear pruebas basadas en código.
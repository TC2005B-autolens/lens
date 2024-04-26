# lens

lens se encarga de calificar y analizar las entregas de tareas de código. Presenta un API para generar tareas, calificar entregas y obtener los resultados.

## Kits
Cada lenguaje de programación requiere diferentes pasos para la ejecución. Algunos son interpretados, otros compilados, y las herramientas para correr pruebas, descargar dependencias y administrar versiones son diferentes. Por ello, cada lenguaje requiere de implementación específica en el sistema. La colección de librerías, código y la imagen de Docker requerida para cada lenguaje se llamará colectivamente un *kit*. Existirá exactamente un *kit* por lenguaje de programación, sea Python, C++, Java, etc.

Cada kit contiene un programa que convierte de la especificación JSON a código. Dependiendo del lenguaje
este proceso ocurrirá en la etapa de compilación (para lenguajes compilados) o ejecución (para lenguajes interpretados)

## Overview
Cuando el programa recibe una asignatura (assignment) nueva:
1. Crea objeto asignatura en la DB (Redis)
    - El objeto contiene información sobre la asignatura, los archivos, y los permisos.
    - UUID único
2. Crear archivos temp de la asignatura.
    - Los archivos se crearán en disco en un folder temporal, el cual se copiará/montará a la imagen de docker.

Cuando el programa recibe una entrega (submission) nueva:
1. Crea tarea en Redis
2. Crea imagen de Docker usando `docker image import` con los archivos de la tarea/entrega
3. Correr dockerfile de kit, que copia los archivos de la imagen via ARG, compila si es necesario, y corre el comando especificado por ENTRYPOINT
4. Leer los resultados y subir resultados a Redis

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
    - Tipo de prueba: 'IO', 'function', 'custom'
        - IO: mandar stdin y revisar stdout
        - function: llamar una función con ciertos parámetros y revisar valor de retorno
        - custom: hacer unit tests con la librería de pruebas usada por el kit

### Resultadios
Existirá un resultado por prueba:
1. ID - string
    - El ID de la prueba a la que se refiere
2. Resultado: una opción entre `pass` | `fail` | `error`
    - `error` está reservado para errores internos con el autograder y no representan un fallo del lado del estudiante
3. Message: En caso de un error se mostrará un mensaje:
    - error:? El error, si uno ocurrió.
        - message: El mensaje del error.
        - type?: El tipo del error, o código.
        - detail?: traceback u otro tipo de información adicional.
    - expected?: opcional. El valor que debería proporcionar el programa con la entrada designada.
    - actual?: opcional. El valor real que se obtuvo.

## Kit
Cada kit deberá implementar funcionalidad básica:
### Ejecución
Se deberá tener la capacidad de tomar código y ejecutarlo, recibiendo datos de stdin y leyendo de stdout.

### Breadcrumbs (delayed)
El kit deberá poder proporcionar información sobre las funciones y clases en los archivos del alumno.


## TODO

Prioridades:
- Funcionalidad Básica (prototipo)
    - Bundling de los archivos de una tarea (tar)
    - Dockerfile para Python
    - Interpretador de assignment.json de Python

Secundarios:
- Refactorizar código a Model-View-Controller
    - Folders: models, controllers, routes, middlewares
    - Tapiduck o similar
        - middleware that provides context for resources e.g assignment data for assignment, etc.
        - it should also verify data with zod
- Crear cola de trabajos para procesamiento de entregas
    - Para pasar los archivos al contenedor el servidor tiene que juntar y comprimirlos desde memoria
    - esto toma tiempo y podría bloquear el hilo principal si hay mucha demanda


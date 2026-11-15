# Lorekeep

**El guardián de tus mundos ficticios.** Una app para escritores, diseñadores de videojuegos y cualquiera que invente universos: personajes, criaturas, lugares, naciones, facciones, culturas, sistemas, magia y objetos, con su cronología y sus mapas, todo enlazado entre sí.

## Qué hace (versión 0.1)

- **Varios mundos**, cada uno con portada y frase.
- **Compendio** por categorías (13 de base, y puedes inventar las tuyas: hechizos, vehículos, profecías…).
- **Fichas** con plantilla según el tipo: imagen, datos (algunos apuntan a otras fichas: especie, líder, origen…), listas (motivaciones, virtudes…), pestañas de texto largo y campos propios.
- **Menciones:** escribe `@Nombre` o `@[Nombre con espacios]` en cualquier texto y queda enlazado. Cada ficha muestra dónde la mencionan.
- **Relaciones** entre fichas ("hermana de", "gobierna", "vive en"…) y una **red** para verlas, con los más conectados.
- **Cronología** con eras, calendario propio (años negativos incluidos) y acontecimientos enlazados a sus fichas.
- **Mapas:** sube una imagen y márcale pines que abren fichas. Se arrastran para moverlos.
- **Respaldo:** exporta un mundo a un `.json` (con imágenes) e impórtalo en otro dispositivo.
- **Instalable** en el celular (Chrome → "Agregar a la pantalla principal") y funciona sin internet.

Todo se guarda **solo en tu dispositivo** (IndexedDB). No hay cuentas ni servidor.

## Para desarrollar

```sh
npm install
npm run dev      # abre http://localhost:5173/
npm run build    # versión final en dist/
```

Se publica sola en GitHub Pages al subir a `main` (`.github/workflows/pages.yml`).

Hecho por **Moros**.

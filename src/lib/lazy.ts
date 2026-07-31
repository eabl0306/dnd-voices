/**
 * Objeto que se construye la primera vez que se le toca una propiedad.
 *
 * Existe por `next build`: para recolectar rutas, Next evalúa todos los
 * módulos del servidor sin las variables de entorno de producción. Un cliente
 * construido al importar (base de datos, auth, SDKs) reventaría el build. Con
 * esto la construcción se aplaza al primer uso real, y `db.scene.findMany(...)`
 * sigue leyéndose igual que si fuera una instancia normal.
 */
export function lazyProxy<T extends object>(factory: () => T): T {
  let instance: T | undefined;
  const resolve = (): T => (instance ??= factory());

  return new Proxy({} as T, {
    get(_target, property) {
      const target = resolve();
      const value = Reflect.get(target, property, target);
      // Los métodos pierden su `this` al extraerlos del Proxy.
      return typeof value === "function" ? value.bind(target) : value;
    },
    has: (_target, property) => property in resolve(),
    ownKeys: () => Reflect.ownKeys(resolve()),
    getOwnPropertyDescriptor: (_target, property) => {
      const descriptor = Reflect.getOwnPropertyDescriptor(resolve(), property);
      // El objetivo del Proxy está vacío, así que todo descriptor que se
      // reporte tiene que ser configurable o el motor lanza un TypeError.
      return descriptor ? { ...descriptor, configurable: true } : undefined;
    },
  });
}

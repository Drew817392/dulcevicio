import { createContext, useContext, useState, useEffect } from 'react';

const CarritoContext = createContext();

export function CarritoProvider({ children }) {
  // Inicializar estado leyendo de localStorage de forma segura
  const [items, setItems] = useState(() => {
    try {
      const guardado = localStorage.getItem('carrito');
      return guardado ? JSON.parse(guardado) : [];
    } catch (error) {
      console.error('Error al leer el carrito desde localStorage, iniciando vacío:', error);
      return [];
    }
  });

  // Guardar en localStorage cada vez que el carrito cambie
  useEffect(() => {
    try {
      localStorage.setItem('carrito', JSON.stringify(items));
    } catch (error) {
      console.error('Error al guardar el carrito en localStorage:', error);
    }
  }, [items]);

  // Agregar producto (suma cantidad si ya existe)
  const agregar = (producto, cantidad = 1) => {
    const cantNum = Number(cantidad) || 1;
    setItems((prevItems) => {
      const index = prevItems.findIndex((item) => item.id === producto.id);
      if (index !== -1) {
        // Ya existe: sumamos la cantidad
        return prevItems.map((item, idx) =>
          idx === index ? { ...item, cantidad: item.cantidad + cantNum } : item
        );
      }
      // No existe: agregamos nuevo ítem con cantidad
      return [...prevItems, { ...producto, cantidad: cantNum }];
    });
  };

  // Modificar cantidad directamente (+ o -)
  const actualizarCantidad = (productoId, delta) => {
    setItems((prevItems) =>
      prevItems
        .map((item) => {
          if (item.id === productoId) {
            const nuevaCantidad = item.cantidad + delta;
            return nuevaCantidad > 0 ? { ...item, cantidad: nuevaCantidad } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  // Quitar producto completamente
  const quitar = (productoId) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== productoId));
  };

  // Vaciar carrito
  const vaciar = () => {
    setItems([]);
  };

  // Total calculado con reduce
  const total = items.reduce((acc, item) => acc + (item.precio_final || 0) * item.cantidad, 0);
  const totalItems = items.reduce((acc, item) => acc + item.cantidad, 0);

  return (
    <CarritoContext.Provider
      value={{
        items,
        agregar,
        actualizarCantidad,
        quitar,
        vaciar,
        total,
        totalItems,
      }}
    >
      {children}
    </CarritoContext.Provider>
  );
}

export function useCarrito() {
  const context = useContext(CarritoContext);
  if (!context) {
    throw new Error('useCarrito debe ser usado dentro de un CarritoProvider');
  }
  return context;
}

/**
 * "Primera Fuerza · Libre", o solo el nombre si el servidor no mandó la categoría.
 *
 * La categoría es opcional porque la app se despliega por separado del backend y se encuentra
 * versiones más viejas. Lo que importa es que un campo ausente **no deje el separador colgando**
 * ("Primera Fuerza · "), que es lo que pasa al interpolar sin más.
 */
export function divisionLabel(division: { nombre: string; categoria?: { nombre: string } }): string {
  return [division.nombre, division.categoria?.nombre].filter(Boolean).join(" · ")
}

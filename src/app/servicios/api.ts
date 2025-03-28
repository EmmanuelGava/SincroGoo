export abstract class ServicioApi {
  protected token: string;
  protected abstract urlBase: string;

  constructor(token: string) {
    this.token = token;
  }

  protected async fetchConAuth<T>(url: string, opciones: RequestInit = {}): Promise<T> {
    const respuesta = await fetch(url, {
      ...opciones,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...opciones.headers,
      },
    });

    if (!respuesta.ok) {
      throw new Error(`Error en la petición: ${respuesta.status}`);
    }

    return respuesta.json();
  }
} 
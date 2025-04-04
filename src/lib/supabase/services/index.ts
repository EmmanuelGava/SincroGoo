import { SlidesService } from './slides';

// Crear una instancia del servicio
const slidesServiceInstance = new SlidesService();

// Exportar instancias de los servicios
export const slidesService = {
  getDiapositivas: slidesServiceInstance.listSlideItems.bind(slidesServiceInstance),
  createDiapositiva: slidesServiceInstance.createSlideItem.bind(slidesServiceInstance),
  updateDiapositiva: slidesServiceInstance.updateSlideItem.bind(slidesServiceInstance),
  deleteDiapositiva: slidesServiceInstance.deleteSlideItem.bind(slidesServiceInstance),
  getElementos: slidesServiceInstance.getSlideElements.bind(slidesServiceInstance),
  createElemento: slidesServiceInstance.createSlideElement.bind(slidesServiceInstance),
  updateElemento: slidesServiceInstance.updateSlideElement.bind(slidesServiceInstance),
  deleteElemento: slidesServiceInstance.deleteSlideElement.bind(slidesServiceInstance),
  createAsociacion: slidesServiceInstance.createElementAssociation.bind(slidesServiceInstance),
  getAsociaciones: slidesServiceInstance.getElementAssociations.bind(slidesServiceInstance),
  deleteAsociacion: slidesServiceInstance.deleteElementAssociation.bind(slidesServiceInstance)
};

// Re-exportar los servicios para mantener compatibilidad
export { SlidesService } from './slides'; 
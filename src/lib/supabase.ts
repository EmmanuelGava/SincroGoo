import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Servicio para manejar diapositivas
export const slidesService = {
  async getDiapositivas({ presentationId }: { presentationId: string }) {
    return await supabase
      .from('slides')
      .select('*')
      .eq('presentation_id', presentationId)
      .order('orden', { ascending: true });
  },

  async createDiapositiva({ presentacion_id, diapositiva_id, orden }: { 
    presentacion_id: string, 
    diapositiva_id: string, 
    orden: number 
  }) {
    return await supabase
      .from('slides')
      .insert([{ 
        presentation_id: presentacion_id,
        slide_id: diapositiva_id,
        orden 
      }])
      .select()
      .single();
  },

  async updateDiapositiva(slideId: string, data: any) {
    return await supabase
      .from('slides')
      .update(data)
      .eq('slide_id', slideId)
      .select()
      .single();
  },

  async deleteDiapositiva(slideId: string) {
    return await supabase
      .from('slides')
      .delete()
      .eq('slide_id', slideId);
  }
};

export default supabase; 
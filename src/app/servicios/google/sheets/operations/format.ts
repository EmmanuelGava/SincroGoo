import { sheets_v4 } from 'googleapis';
import { FormatoCelda, ResultadoActualizacion } from '../types';

export interface OpcionesFormato {
  sheetId: number;
  rango: string;
  formato: FormatoCelda;
}

export interface OpcionesFormatoCondicional extends OpcionesFormato {
  condicion: string;
  formatoFalso?: FormatoCelda;
}

export function crearRequestFormato(opciones: OpcionesFormato): sheets_v4.Schema$Request {
  return {
    repeatCell: {
      range: {
        sheetId: opciones.sheetId,
        startRowIndex: 0,
        endRowIndex: 1000,
        startColumnIndex: 0,
        endColumnIndex: 26
      },
      cell: {
        userEnteredFormat: convertirFormato(opciones.formato)
      },
      fields: obtenerCamposFormato(opciones.formato)
    }
  };
}

export function crearRequestFormatoCondicional(opciones: OpcionesFormatoCondicional): sheets_v4.Schema$Request[] {
  const requests: sheets_v4.Schema$Request[] = [{
    addConditionalFormatRule: {
      rule: {
        ranges: [{
          sheetId: opciones.sheetId,
          startRowIndex: 0,
          endRowIndex: 1000,
          startColumnIndex: 0,
          endColumnIndex: 26
        }],
        booleanRule: {
          condition: {
            type: 'CUSTOM_FORMULA',
            values: [{ userEnteredValue: opciones.condicion }]
          },
          format: convertirFormato(opciones.formato)
        }
      },
      index: 0
    }
  }];

  if (opciones.formatoFalso) {
    requests.push({
      addConditionalFormatRule: {
        rule: {
          ranges: [{
            sheetId: opciones.sheetId,
            startRowIndex: 0,
            endRowIndex: 1000,
            startColumnIndex: 0,
            endColumnIndex: 26
          }],
          booleanRule: {
            condition: {
              type: 'CUSTOM_FORMULA',
              values: [{ userEnteredValue: `=NOT(${opciones.condicion})` }]
            },
            format: convertirFormato(opciones.formatoFalso)
          }
        },
        index: 1
      }
    });
  }

  return requests;
}

function convertirFormato(formato: FormatoCelda): sheets_v4.Schema$CellFormat {
  return {
    backgroundColor: formato.colorFondo ? { red: 1, green: 1, blue: 1 } : undefined,
    textFormat: {
      foregroundColor: formato.color ? { red: 0, green: 0, blue: 0 } : undefined,
      fontFamily: formato.fuente,
      fontSize: formato.tamanioFuente,
      bold: formato.negrita,
      italic: formato.cursiva,
      underline: formato.subrayado
    },
    horizontalAlignment: formato.alineacion?.toLowerCase(),
    numberFormat: formato.formatoNumero ? {
      type: 'NUMBER',
      pattern: formato.formatoNumero
    } : undefined
  };
}

function obtenerCamposFormato(formato: FormatoCelda): string {
  const campos: string[] = [];

  if (formato.colorFondo) campos.push('userEnteredFormat.backgroundColor');
  if (formato.color) campos.push('userEnteredFormat.textFormat.foregroundColor');
  if (formato.fuente) campos.push('userEnteredFormat.textFormat.fontFamily');
  if (formato.tamanioFuente) campos.push('userEnteredFormat.textFormat.fontSize');
  if (formato.negrita !== undefined) campos.push('userEnteredFormat.textFormat.bold');
  if (formato.cursiva !== undefined) campos.push('userEnteredFormat.textFormat.italic');
  if (formato.subrayado !== undefined) campos.push('userEnteredFormat.textFormat.underline');
  if (formato.alineacion) campos.push('userEnteredFormat.horizontalAlignment');
  if (formato.formatoNumero) campos.push('userEnteredFormat.numberFormat');

  return campos.join(',');
}

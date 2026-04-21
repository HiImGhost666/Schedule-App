/**
 * @file csv.test.ts
 * Tests unitarios para las funciones de parseo CSV del backend.
 * Cubre: BOM stripping, comillas RFC 4180, columnas faltantes, filas vacías, encodings.
 */

import { decodeCsvBuffer, parseCsv, parseUserCsv, CSV_HEADERS } from '../src/utils/csv';

// ══════════════════════════════════════════════════════════════════════════════
describe('decodeCsvBuffer', () => {
  it('decodifica un buffer UTF-8 plano sin BOM', () => {
    const input = 'hello,world';
    const result = decodeCsvBuffer(Buffer.from(input, 'utf-8'));
    expect(result).toBe('hello,world');
  });

  it('decodifica UTF-8 con BOM (0xEF 0xBB 0xBF)', () => {
    const bom = Buffer.from([0xef, 0xbb, 0xbf]);
    const text = Buffer.from('name,email', 'utf-8');
    const result = decodeCsvBuffer(Buffer.concat([bom, text]));
    // El BOM es parte del texto en este nivel; parseUserCsv lo limpia
    expect(result).toContain('name,email');
  });

  it('devuelve cadena vacía si el buffer está vacío', () => {
    expect(decodeCsvBuffer(Buffer.alloc(0))).toBe('');
  });

  it('decodifica UTF-16 little-endian con BOM (0xFF 0xFE)', () => {
    const bom = Buffer.from([0xff, 0xfe]);
    const text = Buffer.from('ok', 'utf-16le');
    const result = decodeCsvBuffer(Buffer.concat([bom, text]));
    expect(result).toContain('ok');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
describe('parseCsv (tokenizador de bajo nivel)', () => {
  it('parsea una fila simple sin comillas', () => {
    expect(parseCsv('a,b,c')).toEqual([['a', 'b', 'c']]);
  });

  it('parsea múltiples filas CRLF', () => {
    expect(parseCsv('a,b\r\nc,d')).toEqual([['a', 'b'], ['c', 'd']]);
  });

  it('parsea múltiples filas LF', () => {
    expect(parseCsv('a,b\nc,d')).toEqual([['a', 'b'], ['c', 'd']]);
  });

  it('respeta comas dentro de comillas (RFC 4180)', () => {
    expect(parseCsv('"García, Ana",test@example.com')).toEqual([
      ['García, Ana', 'test@example.com'],
    ]);
  });

  it('respeta saltos de línea dentro de comillas', () => {
    const input = '"linea1\nlinea2",valor';
    expect(parseCsv(input)).toEqual([['linea1\nlinea2', 'valor']]);
  });

  it('escapa comillas dobles internas ("" → ")', () => {
    expect(parseCsv('"di""ez"')).toEqual([['di"ez']]);
  });

  it('devuelve array vacío para string vacío', () => {
    expect(parseCsv('')).toEqual([]);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
describe('parseUserCsv', () => {
  // Helper para construir texto CSV válido con todas las columnas requeridas
  function buildCsv(rows: string[][]): string {
    const header = CSV_HEADERS.join(',');
    const lines = rows.map((r) => r.join(','));
    return [header, ...lines].join('\n');
  }

  it('lanza error cuando el CSV está vacío', () => {
    expect(() => parseUserCsv('')).toThrow('El CSV está vacío');
  });

  it('lanza error cuando faltan columnas obligatorias', () => {
    expect(() => parseUserCsv('name,email\nJohn,john@test.com')).toThrow(
      'Faltan columnas obligatorias'
    );
  });

  it('parsea correctamente una fila válida completa', () => {
    const csv = buildCsv([
      ['Juan Pérez', 'juan@test.com', 'viewer', 'active', 'Seguridad', '', '600111222', ''],
    ]);
    const rows = parseUserCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('Juan Pérez');
    expect(rows[0].email).toBe('juan@test.com');
    expect(rows[0].role).toBe('viewer');
    expect(rows[0].department).toBe('Seguridad');
  });

  it('elimina filas completamente vacías', () => {
    const csv = buildCsv([
      ['Juan', 'juan@test.com', 'viewer', 'active', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
    ]);
    const rows = parseUserCsv(csv);
    expect(rows).toHaveLength(1);
  });

  it('hace trim a los valores de cada celda', () => {
    const csv = buildCsv([['  Ana  ', '  ana@test.com  ', 'admin', 'active', '', '', '', '']]);
    const rows = parseUserCsv(csv);
    expect(rows[0].name).toBe('Ana');
    expect(rows[0].email).toBe('ana@test.com');
  });

  it('elimina el BOM (\\uFEFF) si está presente al inicio', () => {
    const csv = '\uFEFF' + buildCsv([['Luis', 'luis@test.com', '', '', '', '', '', '']]);
    const rows = parseUserCsv(csv);
    expect(rows[0].name).toBe('Luis');
  });

  it('parsea múltiples filas correctamente', () => {
    const csv = buildCsv([
      ['Ana', 'ana@test.com', 'admin', 'active', 'Administración', '', '', ''],
      ['Pedro', 'pedro@test.com', 'viewer', 'disabled', 'Seguridad', '', '', ''],
    ]);
    const rows = parseUserCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[1].name).toBe('Pedro');
    expect(rows[1].status).toBe('disabled');
  });
});

const fs = require('fs');
const { parse } = require('csv-parse');
const db = require('../db');

function importarCSV(tabelaPrecoId, caminhoArquivo) {
  return new Promise((resolve, reject) => {
    const registros = [];

    fs.createReadStream(caminhoArquivo)
      .pipe(
        parse({
          delimiter: ';',
          columns: true,
          trim: true,
          skip_empty_lines: true
        })
      )
      .on('data', (row) => {
        const codigoBase = row.codigo_produto?.trim();
        if (!codigoBase) return;

        registros.push({
          codigo_produto: codigoBase + '-A',
          preco_m2: parseFloat(
            row.preco_m2.replace(',', '.')
          ),
          preco_m2_palete: row.preco_m2_palete
            ? parseFloat(row.preco_m2_palete.replace(',', '.'))
            : null
        });
      })
      .on('end', () => {
        if (!registros.length) {
          return reject('CSV vazio ou inválido');
        }

        const stmt = `
          INSERT INTO produtos_preco (
            tabela_preco_id,
            codigo_produto,
            preco_m2,
            preco_m2_palete,
            atualizado_em
          )
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(tabela_preco_id, codigo_produto)
          DO UPDATE SET
            preco_m2 = excluded.preco_m2,
            preco_m2_palete = excluded.preco_m2_palete,
            atualizado_em = CURRENT_TIMESTAMP
        `;

        db.serialize(() => {
          const prepared = db.prepare(stmt);

          for (const r of registros) {
            prepared.run(
              tabelaPrecoId,
              r.codigo_produto,
              r.preco_m2,
              r.preco_m2_palete
            );
          }

          prepared.finalize((err) => {
            if (err) return reject(err);
            resolve(registros.length);
          });
        });
      })
      .on('error', reject);
  });
}

module.exports = { importarCSV };

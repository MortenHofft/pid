const urlParams = new URLSearchParams(window.location.search);
const queryString = urlParams.get('q');

let months = [];


function search(str) {
  window.table.search(str).draw();
}

function getCountData(current, month, lastMonth) {
  let currentCount = current[`${month}_records`];
  let newIds = current[`${month}_new_ids`];
  let lastCount = lastMonth ? current[`${lastMonth}_records`] : null;
  let diff = currentCount - lastCount - newIds;
  let idsExpected = Math.max(0, currentCount - lastCount);

  let klass = '';

  let change = 0;
  if (lastCount > currentCount) {
    klass = ' warning deletion';
  } else {
    change = 100 * (newIds - idsExpected) / lastCount;
    if (change === 0) {
      klass = 'good';
    } else if (change < 0.01) {
      klass = 'pretty_good';
    } else if (change < 0.05) {
      klass = 'okay';
    } else if (change < 0.1) {
      klass = 'not_good';
    } else if (change < 30) {
      klass = 'bad';
    } else {
      klass = 'critical';
    }
  }

  if (typeof currentCount !== 'number' || typeof lastCount !== 'number') klass = 'invalid';

  const tooltip = `last count: ${lastCount}
  current count: ${currentCount}
  new ids issued: ${newIds}
  ids expected: ${idsExpected}`;
  return {
    cell: `<td class="${klass}" data-tooltip="${tooltip}">
      <div>${currentCount}</div>
      </td>`,
    klass,
    diff,
    currentCount,
    newIds,
    lastCount,
    idsExpected,
    tooltip,
    change
  }
}

function sumRows(a, b) {
  let result = JSON.parse(JSON.stringify(b));
  months.forEach(m => {
    b
  });
  return result;
}

async function loadData() {
  let data = results;
  // data = results.slice(0, 500);

  const tableEl = document.getElementById('table');
  const tableBody = document.getElementById('tableBody');
  const tableHeader = document.getElementById('tableHeader');
  const tableFooter = document.getElementById('tableFooter');
  let rows = '';
  let headers = ['country', 'publisher', 'dataset', 'summary', 'total diff', 'latest not null', 'latest count', 'diff/count', 'duplicated', 'resets'];

  months.forEach(m => headers.push(m));

  let header = '<tr>';
  headers.forEach(h => header += `<th>${h}</th>`);
  header += '</tr>';
  tableHeader.innerHTML = header;
  tableFooter.innerHTML = header;

  data.forEach((x, index) => {
    // if (!(x.latestCount > 1)) {
    //   return;
    // }

    let row = '';
    row = `<tr>
      <td><div data-tooltip="${(x.countryTitle || '').replace(/\"/g, '')}" class="country"><a href="https:/www.gbif.org/country/${x.publisher_country}">${x.countryTitle || x.publisher_country}</a></div></td>
      <td><div data-tooltip="${(x.publisherTitle || '').replace(/\"/g, '')}" class="publisher"><a href="https:/www.gbif.org/publisher/${x.publisher_id}">${x.publisherTitle || x.publisher_id}</a></div></td>
      <td><div data-tooltip="${(x.datasetTitle || '').replace(/\"/g, '')}" class="dataset"><a href="https:/www.gbif.org/dataset/${x.dataset_id}">${x.datasetTitle || x.dataset_id}</a></div></td>`;

    let monthCells = '';
    let spark = '<td><div class="spark">';

    months.forEach((m, i) => {
      let rowInfo = x.monthSummary[m];
      monthCells += rowInfo.cell;
      spark += `<span class="${rowInfo.klass}" data-tooltip="${rowInfo.tooltip}"></span>`;
    });
    spark += '</div></td>'

    row += spark;

    row += `<td>${x.accDiff}</td>`;
    row += `<td>${x.latestNotNullCount}</td>`;
    row += `<td>${x.latestCount || 0}</td>`;
    row += `<td>${x.diffGroup}</td>`;
    row += `<td>${x.isDuplicate ? `<button onClick="search('${x.datasetTitle}')">Duplicate</button>` : ''}</td>`;
    row += `<td>${x.resetCounter}</td>`;

    row += monthCells;
    row += `</tr>`;
    rows += row;
  });

  tableBody.innerHTML = rows;

  $(document).ready(function () {
    $('#table thead tr')
      .clone(true)
      .addClass('filters')
      .appendTo('#table thead');
    window.table = $('#table').DataTable({
      search: {
        return: true
      },
      orderCellsTop: true,
      fixedHeader: true,
      initComplete: function () {
        var api = this.api();

        // For each column
        api
          .columns()
          .eq(0)
          .each(function (colIdx) {
            // Set the header cell to contain the input element
            var cell = $('.filters th').eq(
              $(api.column(colIdx).header()).index()
            );
            var title = $(cell).text();
            $(cell).html('<input type="text" placeholder="' + title + '" />');

            // On every keypress in this input
            $(
              'input',
              $('.filters th').eq($(api.column(colIdx).header()).index())
            )
              .off('keyup change')
              .on('keyup change', function (e) {
                if (e.code !== 'Enter') return;
                e.stopPropagation();

                // Get the search value
                $(this).attr('title', $(this).val());
                var regexr = '({search})'; //$(this).parents('th').find('select').val();

                var cursorPosition = this.selectionStart;
                // Search the column for that value
                api
                  .column(colIdx)
                  .search(
                    this.value != ''
                      ? regexr.replace('{search}', '(((' + this.value + ')))')
                      : '',
                    this.value != '',
                    this.value == ''
                  )
                  .draw();

                $(this)
                  .focus()[0]
                  .setSelectionRange(cursorPosition, cursorPosition);
              });
          });
      },
    });
    if (queryString) window.table.search(queryString).draw();
    tableEl.style.display = 'block';
  });

}

let results = [];
async function init() {
  const response = await (fetch(`./enriched.json`));
  results = await response.json();
  // results = results.slice(0, 500);
  // results = results.filter(x => x.dataset_id === '15f819bd-6612-4447-854b-14d12ee1022d' && x.publisher_id === '396d5f30-dea9-11db-8ab4-b8a03c50a862');

  months = Object.keys(results[0])
    .filter(e => [
      'publisher_country',
      'publisher_id',
      'dataset_id',
      'datasetTitle',
      'publisherTitle',
      'countryTitle'
    ].indexOf(e) === -1)
    .filter(e => !e.endsWith('_new_ids'))
    .map(e => e.substr(0, 10))
    .sort();
  let datasetDuplicates = {};


  results.forEach(x => {
    datasetDuplicates[x.dataset_id] = datasetDuplicates[x.dataset_id] || 0;
    datasetDuplicates[x.dataset_id] = datasetDuplicates[x.dataset_id] + 1;
    let monthSummary = {};
    let accDiff = 0;
    let latestCount;
    let latestNotNullCount = 0;
    let resetCounter = 0;
    months.forEach((m, i) => {
      let lastMonth = months[i - 1];
      let rowSummary = getCountData(x, m, lastMonth);
      monthSummary[m] = rowSummary;
      accDiff += Math.abs(rowSummary.diff || 0);
      if (rowSummary.currentCount > 0) latestNotNullCount = rowSummary.currentCount;
      latestCount = rowSummary.currentCount;
      if (rowSummary.change > 80) resetCounter++;
    });
    x.monthSummary = monthSummary;
    x.latestCount = latestCount;
    x.latestNotNullCount = latestNotNullCount;
    x.accDiff = accDiff;
    x.relativeDiff = accDiff / latestNotNullCount;
    x.diffGroup = '1_near_perfect';
    x.resetCounter = resetCounter;
    if (x.relativeDiff === 0) x.diffGroup = '0_perfect';
    if (x.relativeDiff > 0.05) x.diffGroup = '1_low';
    if (x.relativeDiff > 0.15) x.diffGroup = '2_medium';
    if (x.relativeDiff > 0.50) x.diffGroup = '3_high';
  });
  results.forEach(x => {
    x.datasetCount = datasetDuplicates[x.dataset_id];
    x.isDuplicate = x.datasetCount > 1;
  });

  loadData();
}

init();

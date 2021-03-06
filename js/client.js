$(function () {
    var server = io.connect(window.location.href);

    var $table = $('table');
    $table.tablesort();

    var setColorByDate = function (tr, date, dateString) {
        if (date == 'Invalid Date') {
            if (dateString === 'deleted') {
                tr.attr('data-color', 'blue');
            } else if (dateString === '') {
                tr.removeAttr('data-color');
            } else {
                tr.attr('data-color', 'pink');
            }
        } else {
            var now = new Date();
            var oneWeekAgo = new Date().setDate(now.getDate() - 7);
            var twoDaysAgo = new Date().setDate(now.getDate() - 2);
            if (date < oneWeekAgo) {
                tr.attr('data-color', 'purple');
            } else if (date < twoDaysAgo) {
                tr.attr('data-color', 'green');
            } else {
                tr.removeAttr('data-color');
            }
        }
    };

    $("thead th:contains('Date')").data('sortBy', function (th, td, tablesort) {
        var dateString = td.find('span.data').text();
        var date = new Date(dateString);
        setColorByDate(td.parent(), date, dateString);
        if (date == 'Invalid Date') {
            date = new Date(0);
        }
        return date;
    });
    $table.on('tablesort:start', function (event, tablesort) {
        console.log("Starting the sort...");
    });

    $('#table').click(function (e) {
        e.stopPropagation();
    });
    var $cellEdit = $('#cell-edit');
    $cellEdit.click(function (e) {
        e.stopPropagation();
    });
    $cellEdit.find('input')[0].oninput = function (e) {
        e.preventDefault();
        var $td = $('td.active');
        var existingVal = $td.find('span.data').text();
        var val = $('#cell-edit').find('input').val();
        if (val !== existingVal) {
            var key = $td.parent().attr('data-key');
            var col = $td.closest('table').find('th').eq($td.index()).html();
            var data = {key: key, col: col, val: val};
            var dataJSON = JSON.stringify(data);
            console.log("sending 'update table cell' " + dataJSON);
            server.emit('update table cell', dataJSON);
        }
    };
    $('body').click(function (e) {
        $('td').removeClass('active');
        $('#cell-edit').hide().find('input').val('');
    });
    $('#new-row').click(function (e) {
        var row = {};
        $('th').each(function () {
            var thText = $(this).html();
            if (thText.length > 0) {
                row[thText] = "";
            }
        });
        var rowJSON = JSON.stringify(row);
        console.log("sending 'new table row' " + rowJSON);
        server.emit('new table row', rowJSON);
    });
    $('#toggle-archived').click(function (e) {
        var $this = $(this);
        if ($this.text() === 'Show Archived') {
            $('tr[data-archived=true]').removeClass('hidden').css('display', 'table-row');
            $this.text('Hide Archived');
        } else {
            $('tr[data-archived=true]').addClass('hidden').attr('style', 'display:none !important');
            $this.text('Show Archived');
        }
    });

    var tdOnClick = function (e) {
        var $this = $(this);
        if ($this.parent().attr('data-archived') !== 'true') {
            $('td').removeClass('active');
            $this.addClass('active');
            $('#cell-edit').show().find('input').focus().val($this.find('span.data').html()).select();
        }
    };

    var trashOnClick = function (e) {
        var $this = $(this);
        if ($this.parent().attr('data-archived') !== 'true') {
            if (window.confirm("Are you sure?")) {
                var key = $this.parent().attr('data-key');
                var dataJSON = JSON.stringify({key: key});
                console.log("sending 'delete row' " + dataJSON);
                server.emit('delete row', dataJSON);
            }
        }
    };
    var archiveOnClick = function (e) {
        var key = $(this).parent().attr('data-key');
        var dataArchived = $(this).parent().attr('data-archived');
        var val = (dataArchived === 'true' ? 'false' : 'true');
        var col = '_archived';
        var data = {key: key, col: col, val: val};
        var dataJSON = JSON.stringify(data);
        console.log("sending 'update table cell' " + dataJSON);
        server.emit('update table cell', dataJSON);
    };
    var sortTable = function () {
        var $th = $table.find('th.sorted');
        if ($th.hasClass('descending')) {
            $table.data('tablesort').sort($th, 'desc');
        } else if ($th.hasClass('ascending')) {
            $table.data('tablesort').sort($th, 'asc');
        }
    };

    server.on('connect', function () {
        console.log('established new connection to server, clearing local table');
        $('tbody').html('');
        console.log("sending 'request all' to server");
        server.emit("request all");
    });
    server.on('title', function (dataJSON) {
        $('.title').html(JSON.parse(dataJSON).title);
    });
    server.on('update table cell', function (dataJSON) {
        console.log("received 'update table cell' " + dataJSON);
        var data = JSON.parse(dataJSON);
        if (data.col === '_archived') {
            var $tr = $('tr[data-key="' + data.key + '"]');
            $tr.attr('data-archived', data.val);
            var $toggleArchived = $('#toggle-archived');
            if (data.val === 'true' && $toggleArchived.text() === 'Show Archived') {
                $tr.addClass('hidden').attr('style', 'display:none !important');
            } else {
                $tr.removeClass('hidden').css('display', 'table-row');
            }
            if ($('tr[data-archived=true]').size() < 1) {
                $toggleArchived.addClass('hidden');
            } else {
                $toggleArchived.removeClass('hidden');
            }
            var $td = $tr.find('td .hide.icon, td .unhide.icon');
            if ($tr.attr('data-archived') === 'true') {
                $td.removeClass('hide').addClass('unhide');
            } else {
                $td.removeClass('unhide').addClass('hide');
            }
        } else {
            var $th = $('th:contains(' + data.col + ')');
            var columnIndex = $th.index();
            $('tr[data-key="' + data.key + '"]').find('td').eq(columnIndex).find('span.data').html(data.val);
            if ($th.hasClass('sorted')) {
                sortTable();
            }
        }
    });
    server.on('delete row', function (dataJSON) {
        console.log("received 'delete row' " + dataJSON);
        var data = JSON.parse(dataJSON);
        $('tr[data-key="' + data.key + '"]').remove();
    });
    server.on('new table row', function (rowJSON) {
        console.log("received 'new table row' " + rowJSON);
        var row = JSON.parse(rowJSON);
        var $tr = $('<tr data-key="' + row.key + '"' + '></tr>');
        if (row.data['_archived']) {
            $tr.attr('data-archived', row.data['_archived']);
            var $toggleArchived = $('#toggle-archived');
            if (row.data['_archived'] === 'true' && $toggleArchived.text() === 'Show Archived') {
                $tr.addClass('hidden').attr('style', 'display:none !important');
            } else {
                $tr.removeClass('hidden').css('display', 'table-row');
            }
            if ($('tr[data-archived=true]').size() < 1) {
                $toggleArchived.addClass('hidden');
            } else {
                $toggleArchived.removeClass('hidden');
            }
        }
        var $smallTrashIcon = $('<i class="smallDisplay ui left aligned trash outline icon"></i>');
        var $largeTrashIcon = $('<i class="largeDisplay ui center aligned trash outline icon"></i>');
        var $trashTd = $('<td class="ui collapsing"></td>');
        $trashTd.append($smallTrashIcon).append($largeTrashIcon);
        $trashTd.click(trashOnClick);
        $tr.append($trashTd);
        var hideIcon = 'hide';
        if ($tr.attr('data-archived') === 'true'){
            hideIcon = 'unhide';
        }
        var $smallArchiveIcon = $('<i class="smallDisplay ui left aligned ' + hideIcon + ' icon"></i>');
        var $largeArchiveIcon = $('<i class="largeDisplay ui center aligned ' + hideIcon + ' icon"></i>');
        var $archiveTd = $('<td class="ui collapsing"></td>');
        $archiveTd.append($smallArchiveIcon).append($largeArchiveIcon);
        $archiveTd.click(archiveOnClick);
        $tr.append($archiveTd);
        $('th').each(function () {
            var thText = $(this).html();
            if (thText.length > 0) {
                var $td = $('<td>');
                var $span1 = $('<span class="header smallDisplay">' + thText + ': </span>');
                var $span2 = $('<span class="data">' + row.data[thText] + '</span>');
                $td.click(tdOnClick);
                $td.append($span1).append($span2);
                $tr.append($td);
            }
        });
        $('table').append($tr);
        sortTable();
    });
});

/**
 * Test components/importExport/Export
 * @file
 */
import test from 'tape';
import sinon from 'sinon';
import Radio from 'backbone.radio';
import _ from '../../../../app/scripts/utils/underscore';

import Export from '../../../../app/scripts/components/importExport/Export';
import Notes from '../../../../app/scripts/collections/Notes';
import Tags from '../../../../app/scripts/collections/Tags';

let sand;
test('importExport/Export: before()', t => {
    sand = sinon.sandbox.create();
    t.end();
});

test('importExport/Export: profiles', t => {
    const res = [1, 2];
    const req = sand.stub(Radio, 'request').returns(res);

    t.equal(Export.prototype.profiles, res, 'returns an array of profiles');
    t.equal(req.calledWith('collections/Configs', 'findConfig', {name: 'appProfiles'}),
        true, 'requests profiles from configs');

    sand.restore();
    t.end();
});

test('importExport/Export: collections', t => {
    const names = Export.prototype.collections;
    t.equal(Array.isArray(names), true, 'returns an array');
    t.equal(names.length, 4);
    t.end();
});

test('importExport/Export: init()', t => {
    const con = new Export();
    sand.stub(con, 'exportData').returns(Promise.resolve());
    sand.stub(con, 'export').returns(Promise.resolve());

    const res = con.init();
    t.equal(typeof res.then, 'function', 'returns a promise');
    t.equal(typeof con.zip, 'object', 'creates a JSZip instance');
    t.equal(con.export.called, true, 'calls "export" method');

    con.options = {data: []};
    con.init();
    t.equal(con.exportData.called, true, 'calls "exportData" method');

    sand.restore();
    t.end();
});

test('importExport/Export: exportData()', t => {
    const con = new Export();
    sand.stub(con, 'exportCollections');
    sand.stub(con, 'saveToFile').returns(Promise.resolve());

    const res = con.exportData();
    t.equal(typeof res.then, 'function', 'returns a promise');
    t.equal(con.saveToFile.notCalled, true, 'does nothing if there is no data');

    con.options = {data: {profile: [new Notes()]}};
    con.exportData();
    t.equal(con.exportCollections.calledWith(con.options.data.profile), true,
        'exports data from every profile');
    t.equal(con.saveToFile.called, true, 'saves the result to a ZIP file');

    sand.restore();
    t.end();
});

test('importExport/Export: export()', t => {
    const con      = new Export();
    const profiles = ['notes-db', 'test'];
    Object.defineProperty(con, 'profiles', {get: () => profiles});
    sand.stub(con, 'exportProfile');
    sand.stub(con, 'saveToFile');

    const res = con.export();
    t.equal(con.exportProfile.calledWith('notes-db'), true,
        'export data from "notes-db" profile');
    t.equal(con.exportProfile.calledWith('test'), true,
        'export data from "test" profile');

    res.then(() => {
        t.equal(con.saveToFile.called, true,
            'saves the result to a ZIP file');

        sand.restore();
        t.end();
    });
});

test('importExport/Export: exportProfile()', t => {
    const con = new Export();
    const col = new Notes();
    const req = sand.stub(Radio, 'request').returns(Promise.resolve(col));
    sand.stub(con, 'exportCollections');

    const res = con.exportProfile('test');
    t.equal(typeof res.then, 'function', 'returns a promise');

    const colls = [];
    _.each(con.collections, name => {
        colls.push(col);
        t.equal(req.calledWith(`collections/${name}`, 'find', {profileId: 'test'}),
            true, `fetches ${name} collection`);
    });

    res.then(() => {
        t.equal(con.exportCollections.calledWith(colls), true,
            'exports data from the fetched collections');

        sand.restore();
        t.end();
    });
});

test('importExport/Export: exportCollections()', t => {
    const con = new Export();
    const col = new Notes();
    sand.stub(con, 'exportCollection');

    con.exportCollections([col]);
    t.equal(con.exportCollection.calledWith(col), true,
        'exports data from each collection');

    sand.restore();
    t.end();
});

test('importExport/Export: exportCollection()', t => {
    const con = new Export();
    sand.stub(con, 'exportNote');

    const col = new Notes();
    const mod = new Notes.prototype.model({id: '1'});
    col.fullCollection = col.clone();
    col.fullCollection.add(mod);
    con.exportCollection(col);
    t.equal(con.exportNote.calledWith('laverna-backups/notes-db', mod), true,
        'exports every model from notes collection');

    const tags = new Tags();
    con.zip    = {file: sand.stub()};
    con.exportCollection(tags);
    t.equal(con.zip.file.calledWith('laverna-backups/notes-db/tags.json'),
        true, 'exports data to a JSON file');

    sand.restore();
    t.end();
});

test('importExport/Export: exportNote()', t => {
    const con = new Export();
    const mod = new Notes.prototype.model({id: '1', content: 'test'});
    con.zip   = {file: sand.stub()};

    con.exportNote('backups', mod);
    t.equal(con.zip.file.calledWith('backups/notes/1.md', mod.get('content')),
        true, 'saves the content in a Markdown file');
    t.equal(con.zip.file.calledWith('backups/notes/1.json'),
        true, 'saves other attributes in a JSON file');

    sand.restore();
    t.end();
});

test('importExport/Export: saveToFile()', t => {
    const con = new Export();
    con.zip   = {generateAsync: sand.stub().returns(Promise.resolve('test'))};
    sand.stub(con, 'destroy');
    sand.stub(con, 'saveAs');

    con.saveToFile()
    .then(() => {
        t.equal(con.zip.generateAsync.calledWith({type: 'blob'}), true,
            'generates ZIP blob');
        t.equal(con.saveAs.calledWith('test', 'laverna-backup.zip'), true,
            'saves the blob in laverna-backup.zip archive');

        sand.restore();
        t.end();
    });
});

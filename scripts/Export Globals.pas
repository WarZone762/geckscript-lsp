unit ExportEDID;


var
    file: TStringList;

function Initialize: integer;
begin
    file := TStringList.Create;
    file.Add('[');
end;

function Process(e: IInterface): integer;
var
    edid: string;
    sig: string;
    tmp: string;
begin
    edid := EditorID(e);
    if edid = '' then begin
        Exit;
    end;
    sig :=  Signature(e);
    if sig = 'QUST' then
        tmp := EditorID(LinksTo(ElementByName(e, 'SCRI - Script')));
    if tmp <> '' then begin
        file.Add(Format('    {"type": "%s", "edid": "%s", "origin": "%s", "script": "%s"},', [Signature(e), edid, tmp, BaseName(GetFile(e))]));
        Exit;
    end;

    file.Add(Format('    {"type": "%s", "edid": "%s", "origin": "%s"},', [Signature(e), edid, BaseName(GetFile(e))]));
end;

function Finalize: integer;
var
    lastStr: string;
begin
    lastStr := file.Strings[file.Count - 1];
    file.Strings[file.Count - 1] := LeftStr(lastStr, Length(lastStr) - 1);
    file.Add(']');
    file.SaveToFile(DataPath + 'globals_dump.json');
    file.Free;
end;

end.

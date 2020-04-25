
Vorlage:

ausarbeitung_bsp.tex/.pdf: Beispieldokument mit Text
ausarbeitung.tex/.pdf: wie ausarbeitung_bsp.tex, aber ohne Text;
            nutzbar als leere Formatvorlage / als Ausgangsbasis
bspbib.bib: Datei mit Beispielen für formatierte Literaturdaten;
            die Datei muss mit .bib enden und wird im .tex-Dokument eingebunden
plaindin.bst: Bibstyle-Datei, die die Formatierung der Literatur definiert
            (wird normalerweise nicht geändert)
bspgrafik1.pdf und bspgrafik2.pdf: Zwei Beispielbilder im PDF-Format
            (beispielhaft verwendet in ausarbeitung_bsp.tex)
readme.txt: Diese Datei hier.


Benötigte Werkzeuge zur Arbeit mit Latex:

1) Editor zum Bearbeiten der .tex Datei und der .bib Datei
2) Programme latex, bibtex und ggf. pdflatex
   (als Kommandozeilen-Programme z.B. in Linux oder in einer größeren Latex-Umgebung z.B. miktex/TeXstudio oder miktex/TeXnicCenter unter Windows)


Ablauf:

1) Datei .tex mit dem Ausarbeitungstext erstellen
2) Formatierte Literatur in die Datei mit Endung .bib eintragen
3) Literatur übersetzen mit Programm bibtex (mehrmals aufrufen)
4) .tex Datei übersetzen mit Programm latex oder mit pdflatex
   (erzeugt die Ausarbeitung im Postscript oder PDF-Format)
   
Die Schritte 3 und 4 werden bei Programmen wie z.B. TeXstudio gemeinsam als Übersetzungsfunktion angeboten, wodurch die Arbeit mit TeX-Dokumenten deutlich vereinfacht wird.


Probleme?:

Problem: Der Kommandozeilen-Aufruf mit latex läuft nicht durch
1) Mit Taste <Return> Problemstellen solange überspringen, bis die Bearbeitung abgeschlossen ist; manchmal passt das Ergebnis trotzdem (die Meldungen sollten trotzdem angeschaut werden).
2) Meldungen anschauen und Latex-Fehler in der Ausarbeitung beheben.

Problem: Literatur fehlt oder es sind unaufgelöste Referenzen ("?") enthalten
1) Literatur und verwendete Labels prüfen (richtig geschrieben?)
2) Alles nochmal (mehrmals) übersetzen; für die Referenzen werden immer mehrere Übersetzungsdurchläufe benötigt (bibtex bibtex latex bibtex ...)


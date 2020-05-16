@echo off
goto %1
goto end
:beta
call grunt --server=sp2
:alpha
call grunt --server=cogd
:end

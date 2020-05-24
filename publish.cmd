@echo off
goto %1
goto end
:stable
call grunt --server=screeps
:delta
call grunt --server=sp1
:beta
call grunt --server=sp2
:alpha
call grunt --server=cogd
:end

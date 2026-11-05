# BUG-004 Chrome 재제보 · 2026-11-06

웹 후보 `free-0541-dadcd08d207d`은 입력 처리 중 기존 화면을 분리하는 경로와 상세 저장 경고 표시를 수정했다. 사용자가 제공한 콘솔에는 `can_process` 경고가 있으며, 저장 검증의 세부 코드가 필요하다.

Godot import, compile, export, Next 정적 빌드와 PCK 검증을 완료했다. 사용자 저장 읽기 및 게임이나 브라우저 실행 없이 파일만 확인했다. [BUG-004](../../bugs/BUG-004-free-web-sortie-save-blocked.md) · [패키지 검증](package-verification.json)

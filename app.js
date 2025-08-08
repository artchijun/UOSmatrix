// app.js

// Firebase 설정
const firebaseConfig = {
    apiKey: "AIzaSyAK6GWqYbhv19jTgzVxzXNRdVODFtLMKCA",
    authDomain: "uosmatrix.firebaseapp.com",
    databaseURL: "https://uosmatrix-default-rtdb.firebaseio.com",
    projectId: "uosmatrix",
    storageBucket: "uosmatrix.firebasestorage.app",
    messagingSenderId: "208876542369",
    appId: "1:208876542369:web:a50a4d20468bfb4c8b13e0"
};

// Firebase 초기화
let db;
let firebaseInitialized = false;
let isOnline = navigator.onLine;

// Firebase 초기화 및 데이터베이스 연결
function initializeFirebase() {
    try {
        if (typeof firebase !== 'undefined') {
            firebase.initializeApp(firebaseConfig);
            db = firebase.database();
            firebaseInitialized = true;
            
            // 연결 상태 모니터링
            const connectedRef = db.ref('.info/connected');
            connectedRef.on('value', function(snap) {
                if (snap.val() === true) {
                    isOnline = true;
                    showConnectionStatus('온라인', 'success');
                    // 온라인 상태가 되면 로컬 데이터를 Firebase와 동기화
                    syncLocalDataToFirebase();
                } else {
                    isOnline = false;
                    showConnectionStatus('오프라인', 'warning');
                }
            });
        } else {
            firebaseInitialized = false;
        }
    } catch (error) {
        firebaseInitialized = false;
    }
}

// 연결 상태 표시
function showConnectionStatus(status, type) {
    const statusElement = document.getElementById('connectionStatus');
    if (!statusElement) {
        const statusDiv = document.createElement('div');
        statusDiv.id = 'connectionStatus';
        statusDiv.style.position = 'fixed';
        statusDiv.style.top = '10px';
        statusDiv.style.right = '10px';
        statusDiv.style.padding = '8px 16px';
        statusDiv.style.borderRadius = '4px';
        statusDiv.style.zIndex = '10000';
        statusDiv.style.fontSize = '12px';
        statusDiv.style.fontWeight = 'bold';
        document.body.appendChild(statusDiv);
    }
    
    const element = document.getElementById('connectionStatus');
    element.textContent = `🌐 ${status}`;
    
    if (type === 'success') {
        element.style.backgroundColor = '#d4edda';
        element.style.color = '#155724';
        element.style.border = '1px solid #c3e6cb';
    } else if (type === 'warning') {
        element.style.backgroundColor = '#fff3cd';
        element.style.color = '#856404';
        element.style.border = '1px solid #ffeaa7';
    }
    
    // 3초 후 자동으로 숨기기 (성공 상태는 제외)
    if (type !== 'success') {
        setTimeout(() => {
            if (element) element.style.display = 'none';
        }, 3000);
    }
}

// Firebase에 데이터 저장
async function saveDataToFirebase(path, data) {
    if (!firebaseInitialized || !isOnline) {
        return false;
    }
    
    try {
        await db.ref(path).set(data);
        return true;
    } catch (error) {
        return false;
    }
}

// Firebase에서 데이터 로드
async function loadDataFromFirebase(path) {
    if (!firebaseInitialized) {
        return null;
    }
    
    try {
        const snapshot = await db.ref(path).once('value');
        const data = snapshot.val();
        return data;
    } catch (error) {
        return null;
    }
}

// 로컬 데이터를 Firebase와 동기화
async function syncLocalDataToFirebase() {
    if (!firebaseInitialized || !isOnline) {
        return;
    }
    
    // 동기화 오버레이 표시
    const syncOverlay = document.getElementById('sync-loading-overlay');
    if (syncOverlay) syncOverlay.style.display = 'flex';

    
    try {
        // 버전 데이터 동기화 (버전별 개별 저장)
        const localVersions = localStorage.getItem('uosVersions');
        if (localVersions) {
            const versionsData = JSON.parse(localVersions);
            
            // 각 버전을 개별적으로 저장
            for (const [versionName, versionData] of Object.entries(versionsData)) {
                await saveDataToFirebase(`versions/${versionName}`, versionData);
            }
            
            // 버전 목록 저장
            const versionList = Object.keys(versionsData);
            await saveDataToFirebase('versionList', versionList);
        }
        
        // 현재 버전 동기화
        const currentVer = localStorage.getItem('uosCurrentVersion');
        if (currentVer) {
            await saveDataToFirebase('currentVersion', currentVer);
        }
        
        // 설정 데이터 동기화
        const designSettings = localStorage.getItem('designSettings');
        if (designSettings) {
            await saveDataToFirebase('settings/design', JSON.parse(designSettings));
        }
        
        // 제목들 동기화
        const matrixTitle = localStorage.getItem('matrixTitleText');
        if (matrixTitle) {
            await saveDataToFirebase('settings/matrixTitle', matrixTitle);
        }
        
        const curriculumTitle = localStorage.getItem('curriculumTitleText');
        if (curriculumTitle) {
            await saveDataToFirebase('settings/curriculumTitle', curriculumTitle);
        }
        
        const commonValuesTitle = localStorage.getItem('commonValuesTitleText');
        if (commonValuesTitle) {
            await saveDataToFirebase('settings/commonValuesTitle', commonValuesTitle);
        }
        
        showToast('데이터가 클라우드와 동기화되었습니다.');
        
    } catch (error) {
        showToast('클라우드 동기화에 실패했습니다.');
    } finally {
        // 동기화 오버레이 숨김
        if (syncOverlay) syncOverlay.style.display = 'none';
    }
}

// Firebase에서 모든 데이터 로드
async function loadAllDataFromFirebase() {
    if (!firebaseInitialized) {
        return false;
    }
    
    
    try {
        // 버전 목록 로드
        const versionList = await loadDataFromFirebase('versionList');
        if (versionList && Array.isArray(versionList)) {
            
            // 각 버전 데이터를 개별적으로 로드
            versions = {};
            for (const versionName of versionList) {
                const versionData = await loadDataFromFirebase(`versions/${versionName}`);
                if (versionData) {
                    versions[versionName] = versionData;
                }
            }
            
            // 로컬 스토리지에도 저장
            localStorage.setItem('uosVersions', JSON.stringify(versions));
        } else {
            // 기존 방식으로 전체 버전 데이터 로드 시도
            const firebaseVersions = await loadDataFromFirebase('versions');
            if (firebaseVersions) {
                versions = firebaseVersions;
                localStorage.setItem('uosVersions', JSON.stringify(firebaseVersions));
            }
        }
        
        // 현재 버전 로드
        const firebaseCurrentVersion = await loadDataFromFirebase('currentVersion');
        if (firebaseCurrentVersion) {
            currentVersion = firebaseCurrentVersion;
            localStorage.setItem('uosCurrentVersion', firebaseCurrentVersion);
        }
        
        // 설정 데이터 로드
        const firebaseDesignSettings = await loadDataFromFirebase('settings/design');
        if (firebaseDesignSettings) {
            designSettings = firebaseDesignSettings;
            localStorage.setItem('designSettings', JSON.stringify(firebaseDesignSettings));
        }
        
        // 제목들 로드
        const firebaseMatrixTitle = await loadDataFromFirebase('settings/matrixTitle');
        if (firebaseMatrixTitle) {
            localStorage.setItem('matrixTitleText', firebaseMatrixTitle);
        }
        
        const firebaseCurriculumTitle = await loadDataFromFirebase('settings/curriculumTitle');
        if (firebaseCurriculumTitle) {
            localStorage.setItem('curriculumTitleText', firebaseCurriculumTitle);
        }
        
        const firebaseCommonValuesTitle = await loadDataFromFirebase('settings/commonValuesTitle');
        if (firebaseCommonValuesTitle) {
            localStorage.setItem('commonValuesTitleText', firebaseCommonValuesTitle);
        }
        
        showToast('클라우드에서 데이터를 불러왔습니다.');
        return true;
        
    } catch (error) {
        showToast('클라우드 데이터 로드에 실패했습니다.');
        return false;
    }
}

// 전역 변수
let editingIndex = -1;
let filteredCourses = null;
let isEditMode = false;
let isEditModeMatrix = false;
let isEditModeCurriculum = false;
let designSettings = {
    tableBgColor: '#ffffff',
    headerBgColor: '#2c3e50',
    headerTextColor: '#ffffff',
    borderColor: '#dee2e6',
    fontSize: '14px',
    fontFamily: "'Noto Sans KR', sans-serif",
    rowHeight: '50px',
    cellPadding: '12px',
    borderWidth: '1px',
    hoverEffect: 'background'
};

// 정렬 관련 전역 변수
let currentSortColumn = null;
let currentSortDirection = 'asc';

// 매트릭스 필터링 관련 전역 변수
let filteredMatrixCourses = null;

// 교과목 데이터 (초기값)
let courses = [];

// 이수모형 버전 관리 변수


// 수행평가 매트릭스 데이터
// 구조: { "교과목명": [18개 컬럼의 값 배열] }
// 값 의미: 0=없음, 0.5=◐(부분), 1=●(완전)
// 컬럼 순서: 18개 수행평가 기준 (0~17 인덱스)
let matrixData = {};

// --- 전역 변수 추가 ---
let curriculumCellTexts = {};

// 공통가치대응 편집 모드 전역 변수
let isEditModeCommonValues = false;

// 공통가치대응 셀 편집 중인지 확인하는 전역 변수
let isCommonValuesCellEditing = false;

// 전체 버전 관리 변수
let currentVersion = '기본';
let versions = {};

// 변경 이력 저장
let changeHistory = [];

// --- 실시간 변경 요약용 초기 상태 저장 변수 ---
let initialCourses = [];

// --- 실시간 변경 요약(diff) 함수 ---
function getCurrentDiffSummary() {
    const summary = [];
    // id 기준 매핑
    const initialMap = {};
    initialCourses.forEach(c => { if (c.id) initialMap[c.id] = c; });
    const currentMap = {};
    courses.forEach(c => { if (c.id) currentMap[c.id] = c; });
    // 추가: 현재에만 있는 id
    for (const id in currentMap) {
        if (!initialMap[id]) {
            summary.push({ type: '추가', course: currentMap[id] });
        }
    }
    // 삭제: 초기상태에만 있는 id
    for (const id in initialMap) {
        if (!currentMap[id]) {
            summary.push({ type: '삭제', course: initialMap[id] });
        }
    }
    // 수정: id가 모두 있는 경우 속성 비교
    for (const id in currentMap) {
        if (initialMap[id]) {
            const before = initialMap[id];
            const after = currentMap[id];
            const fields = ['yearSemester','courseNumber','courseName','credits','category','isRequired','professor','description'];
            const changes = [];
            fields.forEach(field => {
                if ((before[field]||'') !== (after[field]||'')) {
                    changes.push({ field, before: before[field], after: after[field] });
                }
            });
            if (changes.length > 0) {
                summary.push({ type: '수정', course: after, changes });
            }
        }
    }
    return summary;
}

function loadChangeHistory() {
    const saved = localStorage.getItem('changeHistory');
    if (saved) changeHistory = JSON.parse(saved);
}
function saveChangeHistory() {
    localStorage.setItem('changeHistory', JSON.stringify(changeHistory));
}

function addChangeHistory(type, courseName, changes) {
    const entry = {
        timestamp: new Date().toLocaleString('ko-KR'),
        type,
        courseName,
        changes
    };
    changeHistory.unshift(entry); // 최신순
    saveChangeHistory();
    renderChangeHistoryPanel();
}

// 교과목 수정/삭제/추가/이동 함수에 아래와 같이 삽입 예시:
// addChangeHistory('수정', course.courseName, [{field: '학점', before: 2, after: 3}]);

// 변경 이력 패널 토글
function toggleChangeHistoryPanel() {
    const panel = document.getElementById('changeHistoryPanel');
    if (panel.style.display === 'none' || panel.style.display === '') {
        panel.style.display = 'block';
        // 크기조절 자연스럽게: right 고정 해제, left 지정
        panel.style.right = 'auto';
        panel.style.left = 'calc(100vw - 440px)'; // 적당히 오른쪽에 위치
        renderChangeHistoryPanel();
    } else {
        panel.style.display = 'none';
    }
}

// 변경 이력 패널 렌더링
function renderChangeHistoryPanel() {
    const panelList = document.getElementById('changeHistoryPanelList');
    const actionsDiv = document.getElementById('changeHistoryActions');
    if (!panelList) return;
    
    const diffSummary = restoredVersionChangeHistory || getCurrentDiffSummary();
    if (restoredVersionChangeHistory) {
        restoredVersionChangeHistory = null;
    }
    
    if (!diffSummary || diffSummary.length === 0) {
        panelList.innerHTML = "<li style='text-align:center; color:#888; padding:12px 0;'>변경 이력이 없습니다.</li>";
        // 확정 버튼 숨기기
        if (actionsDiv) actionsDiv.style.display = 'none';
        return;
    }
    
    // 변경사항이 있으면 확정 버튼 표시
    if (actionsDiv) actionsDiv.style.display = 'block';
    
    const fieldMap = {
        yearSemester: '학년학기',
        courseNumber: '과목번호',
        courseName: '교과목명',
        credits: '학점',
        category: '구분',
        isRequired: '필수여부',
        professor: '담당교수',
        description: '설명',
        '학년학기': '학년학기',
    };
    panelList.innerHTML = diffSummary.map((entry, idx) => {
        let summary = '';
        if (entry.type === '추가') {
            summary = `<b>${entry.course.courseName}</b> 추가 ${entry.course.yearSemester || ''}`;
        } else if (entry.type === '삭제') {
            summary = `<b>${entry.course.courseName}</b> 삭제`;
        } else if (entry.type === '수정') {
            summary = `<b>${entry.course.courseName}</b> `;
            summary += entry.changes.map(c => {
                const field = fieldMap[c.field] || c.field;
                const before = (c.before+"").length > 12 ? (c.before+"").slice(0,12)+"..." : c.before;
                const after = (c.after+"").length > 12 ? (c.after+"").slice(0,12)+"..." : c.after;
                return `<span style='color:#1976d2;'>${field}</span>: <span style='color:#888'>${before}</span>→<span style='color:#1976d2'>${after}</span>`;
            }).join(', ');
        }
        return `<li data-idx='${idx}'>
            <span class=\"change-history-type ${entry.type}\">${entry.type}</span>
            <span class=\"change-history-summary\">${summary}</span>
            <button class='change-history-apply-btn' title='이 변경 적용'>&#10003;</button>
            <button class='change-history-delete-btn' title='이 변경 되돌리기'>&times;</button>
        </li>`;
    }).join('');
    
    // X(취소) 버튼 이벤트
    const delBtns = panelList.querySelectorAll('.change-history-delete-btn');
    delBtns.forEach(btn => {
        btn.onclick = function(e) {
            const idx = parseInt(btn.parentElement.getAttribute('data-idx'));
            handleChangeHistoryDelete(diffSummary[idx]);
        };
    });
    // ✔(적용) 버튼 이벤트
    const applyBtns = panelList.querySelectorAll('.change-history-apply-btn');
    applyBtns.forEach(btn => {
        btn.onclick = function(e) {
            const idx = parseInt(btn.parentElement.getAttribute('data-idx'));
            handleChangeHistoryApply(diffSummary[idx]);
        };
    });
}

// diff 항목 적용(확정) 처리
function handleChangeHistoryApply(entry) {
    if (!entry) return;
    
    // 공통가치대응 표의 셀 데이터 보존
    const currentCommonValuesData = collectCommonValuesTableData();
    
    if (entry.type === '수정') {
        // 수정: 해당 교과목의 변경 필드들을 after 값으로 확정
        const course = courses.find(c => c.id === entry.course.id);
        if (course) {
            entry.changes.forEach(c => {
                course[c.field] = c.after;
            });
        }
        
        // initialCourses에서 해당 교과목 찾기
        let initialCourse = initialCourses.find(c => c.id === entry.course.id);
        
        // initialCourses에 없으면 추가
        if (!initialCourse) {
            initialCourse = JSON.parse(JSON.stringify(entry.course));
            initialCourses.push(initialCourse);
        }
        
        // initialCourses의 해당 교과목도 after 값으로 업데이트
        entry.changes.forEach(c => {
            initialCourse[c.field] = c.after;
        });
        
    } else if (entry.type === '추가') {
        // 추가: 해당 교과목을 initialCourses에 추가(확정)
        const exists = initialCourses.find(c => c.id === entry.course.id);
        if (!exists) initialCourses.push(JSON.parse(JSON.stringify(entry.course)));
    } else if (entry.type === '삭제') {
        // 삭제: initialCourses에서 해당 교과목 제거(확정)
        const idx = initialCourses.findIndex(c => c.id === entry.course.id);
        if (idx !== -1) initialCourses.splice(idx, 1);
    }
    
    // changeHistory 배열은 사용하지 않음 (getCurrentDiffSummary()가 실시간으로 계산)
    
    // UI 갱신
    commonValuesCellTexts = currentCommonValuesData;
    renderChangeHistoryPanel();
    renderCurriculumTable();
    renderCourses();
    if (document.getElementById('commonValues')?.classList.contains('active')) {
        renderCommonValuesTable();
    }
    updateStats();
    
}

// diff 항목 삭제(되돌리기) 처리
function handleChangeHistoryDelete(entry) {
    if (!entry) return;
    
    // 공통가치대응 표의 셀 데이터 보존
    const currentCommonValuesData = collectCommonValuesTableData();
    
    if (entry.type === '수정') {
        // 수정: 해당 교과목의 변경 필드들을 before 값으로 롤백
        const course = courses.find(c => c.id === entry.course.id);
        if (course) {
            entry.changes.forEach(c => {
                course[c.field] = c.before;
            });
        }
    } else if (entry.type === '추가') {
        // 추가: 해당 교과목 삭제
        const idx = courses.findIndex(c => c.id === entry.course.id);
        if (idx !== -1) courses.splice(idx, 1);
    } else if (entry.type === '삭제') {
        // 삭제: 초기 상태의 교과목을 복원
        const orig = initialCourses.find(c => c.id === entry.course.id);
        if (orig) courses.push(JSON.parse(JSON.stringify(orig)));
    }
    
    // 공통가치대응 표의 셀 데이터 복원
    commonValuesCellTexts = currentCommonValuesData;
    
    renderChangeHistoryPanel();
    renderCurriculumTable();
    renderCourses();
    renderMatrix();
    // 공통가치대응 탭이 활성화된 경우에만 즉시 렌더링
    const commonValuesTab = document.getElementById('commonValues');
    if (commonValuesTab && commonValuesTab.classList.contains('active')) {
        renderCommonValuesTable();
    }
    updateStats();
}

// 모든 변경사항 확정
function confirmAllChanges() {
    if (!confirm('모든 변경사항을 확정하시겠습니까?\n확정 후에는 되돌릴 수 없습니다.')) {
        return;
    }
    
    // 현재 상태를 초기 상태로 설정
    initialCourses = JSON.parse(JSON.stringify(courses));
    ensureCourseIds(initialCourses);
    
    // 변경이력 초기화
    changeHistory = [];
    saveChangeHistory();
    
    // 모든 UI 요소 즉시 업데이트
    renderChangeHistoryPanel();
    renderCourses();
    renderMatrix();
    renderCurriculumTable();
    // 공통가치대응 탭이 활성화된 경우에만 즉시 렌더링
    const commonValuesTab = document.getElementById('commonValues');
    if (commonValuesTab && commonValuesTab.classList.contains('active')) {
        renderCommonValuesTable();
    }
    updateStats();
    
    showToast('모든 변경사항이 확정되었습니다.');
}

// 모든 변경사항 초기화 (원래 상태로 되돌리기)
function resetAllChanges() {
    if (!confirm('모든 변경사항을 초기 상태로 되돌리시겠습니까?\n현재 변경사항은 모두 사라집니다.')) {
        return;
    }
    
    // 공통가치대응 표의 셀 데이터 보존
    const currentCommonValuesData = collectCommonValuesTableData();
    
    // 초기 상태로 복원
    courses = JSON.parse(JSON.stringify(initialCourses));
    ensureCourseIds(courses);
    
    // 공통가치대응 표의 셀 데이터 복원
    commonValuesCellTexts = currentCommonValuesData;
    
    // 변경이력 초기화
    changeHistory = [];
    saveChangeHistory();
    
    // UI 업데이트
    renderChangeHistoryPanel();
    renderCurriculumTable();
    renderCourses();
    renderMatrix();
    // 공통가치대응 탭이 활성화된 경우에만 즉시 렌더링
    const commonValuesTab = document.getElementById('commonValues');
    if (commonValuesTab && commonValuesTab.classList.contains('active')) {
        renderCommonValuesTable();
    }
    updateStats();
    
    showToast('모든 변경사항이 초기 상태로 되돌려졌습니다.');
}

// 최근 버전 자동 선택 함수
function selectLatestVersion() {
    if (!versions || Object.keys(versions).length === 0) {
        currentVersion = '기본';
        return;
    }
    
    // 버전 목록에서 최신 버전 찾기
    const versionNames = Object.keys(versions);
    let latestVersion = '기본';
    let latestTimestamp = 0;
    
    versionNames.forEach(versionName => {
        const version = versions[versionName];
        if (version && version.metadata && version.metadata.timestamp) {
            if (version.metadata.timestamp > latestTimestamp) {
                latestTimestamp = version.metadata.timestamp;
                latestVersion = versionName;
            }
        }
    });
    
    // 최신 버전이 '기본'이 아니고 실제로 존재하는 경우에만 선택
    if (latestVersion !== '기본' && versions[latestVersion]) {
        currentVersion = latestVersion;
    } else {
        currentVersion = '기본';
    }
    
    // localStorage 업데이트
    localStorage.setItem('uosCurrentVersion', currentVersion);
}

// 선택된 버전의 데이터를 메모리에 복원
function restoreSelectedVersionData() {
    if (typeof versions !== 'undefined' && currentVersion && versions[currentVersion]) {
        const v = versions[currentVersion];
        
        // 1. 교과목 관리 탭 데이터 복원
        if (v.coursesTab) {
            courses = v.coursesTab.courses || [];
            initialCourses = v.coursesTab.initialCourses || JSON.parse(JSON.stringify(courses));
        } else {
            // 기존 구조 호환성 (레거시 지원)
            courses = v.courses || [];
            initialCourses = v.initialCourses || JSON.parse(JSON.stringify(courses));
        }
        
        // 2. 수행평가 매트릭스 탭 데이터 복원 (깊은 복사 적용)
        if (v.matrixTab) {
            matrixData = v.matrixTab.matrixData ? 
                JSON.parse(JSON.stringify(v.matrixTab.matrixData)) : {};
            
            if (v.matrixTab.matrixTitleText) {
                localStorage.setItem('matrixTitleText', v.matrixTab.matrixTitleText);
            }
            
            // matrixExtraTableData 복원 (깊은 복사 적용)
            if (v.matrixTab.matrixExtraTableData) {
                matrixExtraTableData = JSON.parse(JSON.stringify(v.matrixTab.matrixExtraTableData));
            } else {
                matrixExtraTableData = {};
            }
        } else {
            // 기존 구조 호환성 (깊은 복사 적용)
            matrixData = v.matrixData ? JSON.parse(JSON.stringify(v.matrixData)) : {};
            
            // matrixExtraTableData 복원 (깊은 복사 적용)
            if (v.matrixExtraTableData) {
                matrixExtraTableData = JSON.parse(JSON.stringify(v.matrixExtraTableData));
            } else {
                matrixExtraTableData = {};
            }
        }
        
        // 3. 이수모형 탭 데이터 복원
        if (v.curriculumTab) {
            curriculumCellTexts = v.curriculumTab.curriculumCellTexts || {};
            if (v.curriculumTab.curriculumTitleText) {
                localStorage.setItem('curriculumTitleText', v.curriculumTab.curriculumTitleText);
            }
        } else {
            // 기존 구조 호환성
            curriculumCellTexts = v.curriculumCellTexts || {};
        }
        
        // 4. 공통가치대응 탭 데이터 복원
        if (v.commonValuesTab) {
            commonValuesCellTexts = v.commonValuesTab.commonValuesCellTexts || {};
            if (v.commonValuesTab.commonValuesTitleText) {
                localStorage.setItem('commonValuesTitleText', v.commonValuesTab.commonValuesTitleText);
            }
        } else {
            // 기존 구조 호환성
            commonValuesCellTexts = v.commonValuesCellTexts || {};
            commonValuesCopiedBlocks = v.commonValuesCopiedBlocks || {};
        }
        
        // 공통 설정 복원
        if (v.settings) {
            designSettings = v.settings.designSettings || designSettings;
            // 변경이력 복원 추가
            changeHistory = v.settings.changeHistory || [];
        } else {
            // 기존 구조 호환성
            designSettings = v.designSettings || designSettings;
            // 변경이력 복원 추가 (레거시)
            changeHistory = v.changeHistory || [];
        }
        
    } else {
    }
    
    // 복원 후 curriculum 탭이 마지막 탭이면 diff가 올바르게 반영되도록 강제 showTab 호출
    const lastTab = localStorage.getItem('uosLastTab') || 'courses';
    if (lastTab === 'curriculum') {
        setTimeout(() => {
            showTab('curriculum');
        }, 100);
    }
    // [추가] 변경이력 패널 즉시 갱신 및 변경이력 모달 자동 표시
    if (Array.isArray(changeHistory) && changeHistory.length > 0) {
        renderChangeHistoryPanel();
        // showChangeHistoryModal(); // 자동 팝업 제거
        // 변경이력이 있을 때 강제로 diff 갱신
        getCurrentDiffSummary();
    }
}

function showChangeHistoryModal() {
    // 변경이력 패널을 보이게 함
    const panel = document.getElementById('changeHistoryPanel');
    if (panel) {
        panel.style.display = 'block';
        // 변경이력 패널 내용 갱신
        if (typeof renderChangeHistoryPanel === 'function') {
            renderChangeHistoryPanel();
        }
    }
}

// 페이지 로드 시 이력 불러오기
loadChangeHistory();

// 페이지 초기화
function init() {
    // Firebase 초기화
    initializeFirebase();
    
    // Firebase에서 데이터 로드 시도
    loadAllDataFromFirebase().then(firebaseLoaded => {
        if (firebaseLoaded) {
            // Firebase 로드 성공 시 최근 버전 자동 선택
            selectLatestVersion();
        } else {
        }
        
        // 동기화 완료 후 로컬 버전 로드
        loadAllVersions();
        
        // 선택된 버전의 데이터를 메모리에 복원
        restoreSelectedVersionData();
        
        // UI 초기화
        initializeUI();
    }).catch(error => {
        
        // 오류 발생 시 로컬 데이터로 폴백
        loadAllVersions();
        restoreSelectedVersionData();
        initializeUI();
    });

}

// UI 초기화 함수
function initializeUI() {
    // id 보장
    ensureCourseIds(courses);

    // --- 최초 진입 시에만 초기 상태 저장 (버전 복원 후에는 덮어쓰지 않음) ---
    if (!Array.isArray(initialCourses) || initialCourses.length === 0) {
        initialCourses = JSON.parse(JSON.stringify(courses));
        ensureCourseIds(initialCourses);
    }

    loadDesignSettings();

    renderCourses();
    renderMatrix();
    updateStats();
    drawChart();
    drawSubjectTypeChart();
    renderCurriculumTable(); // 이수모형표 렌더링 추가
    // 변경이력 diff 강제 초기화 및 이수모형표 재렌더링 (최초 로딩시 diff 반영 보장)
    getCurrentDiffSummary();
    renderCurriculumTable();
    setupCurriculumDropZones(); // 드롭 영역 설정 추가
    updateCurriculumFontSize(); // 이수모형 폰트 크기 초기화 추가
    // 이수모형 버전 라벨 업데이트 (현재 버전 표시)
    updateCurriculumVersionLabel();
    renderMatrixExtraTable(); // matrix-extra-table 렌더링 추가
    // 마지막에 열었던 탭에서 시작
    const lastTab = localStorage.getItem('uosLastTab') || 'courses';
    showTab(lastTab);
    updateCurrentVersionDisplay();
    updateAllVersionLabels();
    updateVersionNavigationButtons();
    
    // 저장된 이수모형 글씨 크기 적용
    setTimeout(() => {
        updateCurriculumFontSize();
    }, 100);
    
    // 창 크기 변경 시 차트 재렌더링 및 이수모형 글씨 크기 유지 (디바운싱 적용)
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
        const activeTab = document.querySelector('.tab.active');
        if (activeTab && activeTab.textContent === '분석 및 통계') {
                drawChart();
                drawSubjectTypeChart();
            }
            
            // 이수모형 탭의 글씨 크기 유지 및 화살표 재그리기
            if (activeTab && activeTab.textContent === '이수모형') {
                updateCurriculumFontSize();
                // 이동된 교과목이 있으면 화살표 재그리기
                const movedCoursesForGhost = getMovedCoursesForGhost();
                if (movedCoursesForGhost.length > 0) {
                    clearMoveArrows();
                    drawMoveArrows(movedCoursesForGhost);
        }
            }
        }, 250); // 디바운싱 시간을 250ms로 설정
    });
    

    // 만약 이수모형 탭이 활성화되어 있다면 diff 반영을 위해 한 번 더 showTab 호출
    setTimeout(() => {
        const curriculumTab = document.getElementById('curriculum');
        if (curriculumTab && curriculumTab.classList.contains('active')) {
            showTab('curriculum');
        }
    }, 200);

    // 모든 렌더링 및 데이터 복원 완료 후 오버레이 숨김
    const overlay = document.getElementById('cloud-loading-overlay');
    if (overlay) overlay.style.display = 'none';
}

// 매트릭스 탭 수정모드 토글
function toggleEditMode() {
    isEditModeMatrix = !isEditModeMatrix;
    const button = document.getElementById('editModeToggle');
    const textSpan = document.getElementById('editModeText');
    if (button && textSpan) {
        if (isEditModeMatrix) {
            button.classList.add('active');
            textSpan.textContent = '수정모드';
        } else {
            button.classList.remove('active');
            textSpan.textContent = '일반모드';
        }
    }
    
    if (isEditModeMatrix) {
        enableCellEditing();
        addMatrixCellClickListeners();
        // matrix-extra-table 편집 모드 활성화
        toggleMatrixExtraTableEditMode();
        // 매트릭스 제목 편집 모드 활성화
        setMatrixTitleEditable(true);
    } else {
        disableCellEditing();
        // matrix-extra-table 편집 모드 비활성화
        toggleMatrixExtraTableEditMode();
        // 매트릭스 제목 편집 모드 비활성화
        setMatrixTitleEditable(false);
    }
}

// 교과목 관리 탭 수정모드 토글
function toggleEditModeCourses() {
    isEditMode = !isEditMode;
    const button = document.getElementById('editModeToggleCourses');
    const textSpan = document.getElementById('editModeTextCourses');
    
    if (isEditMode) {
        // 수정모드 활성화
        button.classList.add('active');
        textSpan.textContent = '수정모드';
        enableCellEditing();
    } else {
        // 수정모드 비활성화
        button.classList.remove('active');
        textSpan.textContent = '일반모드';
        disableCellEditing();
    }
}

// 셀 편집 활성화 (이벤트 리스너 중복 등록 방지)
function enableCellEditing() {
    const tables = document.querySelectorAll('table');
    tables.forEach(table => {
        // matrix-extra-table은 별도 처리하므로 제외
        if (table.classList.contains('matrix-extra-table')) {
            return;
        }
        
        const cells = table.querySelectorAll('td');
        cells.forEach((cell, index) => {
            if (!cell.classList.contains('no-edit')) {
                cell.classList.add('editable-cell');
                
                // 이벤트 리스너 중복 등록 방지: 동일한 함수 참조 사용
                const existingHandler = cell._clickHandler;
                if (existingHandler) {
                    cell.removeEventListener('click', existingHandler);
                }
                
                // 새로운 핸들러 함수 생성 및 저장
                const clickHandler = function(event) {
                    handleCellClick(event);
                };
                cell._clickHandler = clickHandler;
                cell.addEventListener('click', clickHandler);
                
            } else {
            }
        });
    });
}

// 매트릭스 테이블에 직접 클릭 이벤트 추가 (더 이상 사용하지 않음)
function addMatrixCellClickListeners() {
    // 이 함수는 더 이상 사용하지 않습니다.
    // 매트릭스 셀에 직접 이벤트 리스너가 추가되므로 불필요합니다.
}

// 매트릭스 셀 직접 클릭 처리
function handleMatrixCellClickDirect(event) {
    if (!isEditModeMatrix) return;
    
    const cell = event.target;
    
    const originalContent = cell.innerHTML;
    const row = cell.closest('tr');
    
    // 실제 셀 인덱스 계산 (rowSpan 고려)
    const cells = Array.from(row.children);
    const cellIndex = cells.indexOf(cell);
    
    // 매트릭스 데이터 셀인지 확인 (6번째 셀부터)
    if (cellIndex < 5) {
        return;
    }
    
    // 과목명 찾기 (rowSpan 고려하여 실제 위치 계산)
    let courseName = '';
    let course = null;
    
    // 현재 행에서 과목명 셀 찾기
    const nameCell = row.querySelector('td:nth-child(4)');
    if (nameCell) {
        courseName = nameCell.textContent;
        course = courses.find(c => c.courseName === courseName);
    }
    
    
    if (!course) {
        return;
    }
    
    // 순환 편집: 빈 값 → ● → ◐ → 빈 값
    let currentValue = 0;
    if (originalContent.includes('●')) {
        currentValue = 1;
    } else if (originalContent.includes('◐')) {
        currentValue = 0.5;
    }
    
    
    let newMatrixValue = 0;
    let newDisplayContent = '';
    let markClass = '';
    
    // 실제 매트릭스 컬럼 인덱스 계산 (첫 5개 컬럼 제외)
    const matrixColIndex = cellIndex - 5;
    
    if (matrixColIndex >= 0 && matrixColIndex <= 3) {
        markClass = 'matrix-mark-thinking';
    } else if (matrixColIndex >= 4 && matrixColIndex <= 10) {
        markClass = 'matrix-mark-design';
    } else if (matrixColIndex >= 11 && matrixColIndex <= 15) {
        markClass = 'matrix-mark-tech';
    } else if (matrixColIndex >= 16 && matrixColIndex <= 17) {
        markClass = 'matrix-mark-practice';
    }
    
    if (currentValue === 0) {
        newMatrixValue = 1;
        newDisplayContent = `<span class="matrix-mark ${markClass}">●</span>`;
    } else if (currentValue === 1) {
        newMatrixValue = 0.5;
        newDisplayContent = `<span class="matrix-mark ${markClass}">◐</span>`;
    } else {
        newMatrixValue = 0;
        newDisplayContent = '';
    }
    
    
    // 매트릭스 데이터 업데이트
    if (matrixColIndex >= 0 && matrixColIndex < 18) {
        if (!matrixData[courseName]) {
            matrixData[courseName] = new Array(18).fill(0);
        }
        matrixData[courseName][matrixColIndex] = newMatrixValue;
    }
    
    // 셀 내용 업데이트
    cell.innerHTML = newDisplayContent;
    
    // 시각적 피드백 (임시로 배경색 변경)
    cell.style.backgroundColor = '#fff3cd';
    setTimeout(() => {
        cell.style.backgroundColor = '';
    }, 300);
    
    // 교과목 테이블 업데이트
    renderCourses();
    
    // 매트릭스 테이블 다시 렌더링하여 정렬 유지
    renderMatrix();
    
}

// 간단한 매트릭스 셀 클릭 처리
function handleMatrixCellClickSimple(cell) {
    if (!isEditModeMatrix) return;
    
    
    // 데이터 속성에서 정보 가져오기
    const courseName = cell.getAttribute('data-course-name');
    const colIndex = parseInt(cell.getAttribute('data-col-index'));
    
    
    if (!courseName || colIndex === undefined) {
        return;
    }
    
    const course = courses.find(c => c.courseName === courseName);
    if (!course) {
        return;
    }
    
    // 순환 편집: 빈 값 → ● → ◐ → 빈 값
    const originalContent = cell.innerHTML;
    let currentValue = 0;
    if (originalContent.includes('●')) {
        currentValue = 1;
    } else if (originalContent.includes('◐')) {
        currentValue = 0.5;
    }
    
    
    let newMatrixValue = 0;
    let newDisplayContent = '';
    let markClass = '';
    
    // 카테고리별 색상 클래스 결정
    if (colIndex >= 0 && colIndex <= 3) {
        markClass = 'matrix-mark-thinking';
    } else if (colIndex >= 4 && colIndex <= 10) {
        markClass = 'matrix-mark-design';
    } else if (colIndex >= 11 && colIndex <= 15) {
        markClass = 'matrix-mark-tech';
    } else if (colIndex >= 16 && colIndex <= 17) {
        markClass = 'matrix-mark-practice';
    }
    
    if (currentValue === 0) {
        newMatrixValue = 1;
        newDisplayContent = `<span class="matrix-mark ${markClass}">●</span>`;
    } else if (currentValue === 1) {
        newMatrixValue = 0.5;
        newDisplayContent = `<span class="matrix-mark ${markClass}">◐</span>`;
    } else {
        newMatrixValue = 0;
        newDisplayContent = '';
    }
    
    
    // 매트릭스 데이터 업데이트
    if (colIndex >= 0 && colIndex < 18) {
        if (!matrixData[courseName]) {
            matrixData[courseName] = new Array(18).fill(0);
        }
        matrixData[courseName][colIndex] = newMatrixValue;
    }
    
    // 셀 내용 업데이트
    cell.innerHTML = newDisplayContent;
    
    // 시각적 피드백 (임시로 배경색 변경)
    cell.style.backgroundColor = '#fff3cd';
    setTimeout(() => {
        cell.style.backgroundColor = '';
    }, 300);
    
    // 교과목 테이블 업데이트
    renderCourses();
    
    // 매트릭스 테이블 다시 렌더링하여 정렬 유지
    renderMatrix();
    
}

// 셀 편집 비활성화 (이벤트 리스너 중복 등록 방지)
function disableCellEditing() {
    const tables = document.querySelectorAll('table');
    tables.forEach(table => {
        const cells = table.querySelectorAll('td');
        cells.forEach(cell => {
            cell.classList.remove('editable-cell');
            
            // 저장된 핸들러 함수로 이벤트 리스너 제거
            const existingHandler = cell._clickHandler;
            if (existingHandler) {
                cell.removeEventListener('click', existingHandler);
                delete cell._clickHandler;
            }
        });
    });
    
    // 모든 편집 중인 셀을 원래 상태로 복원
    const editingCells = document.querySelectorAll('.editing-cell');
    editingCells.forEach(cell => {
        const originalContent = cell.getAttribute('data-original-content');
        if (originalContent !== null) {
            cell.innerHTML = originalContent;
            cell.classList.remove('editing-cell');
            cell.removeAttribute('data-original-content');
        }
    });
}

// 셀 클릭 처리
function handleCellClick(event) {
    if (!isEditMode) return;
    
    const cell = event.target;
    if (cell.classList.contains('editing-cell')) return;
    
    // 매트릭스 테이블의 경우 순환 편집
    if (cell.closest('#matrixTable')) {
        // 과목명 셀은 편집하지 않음
        const cellIndex = Array.from(cell.parentNode.children).indexOf(cell);
        if (cellIndex === 3) return; // 과목명 셀 (4번째)
        
        // 매트릭스 셀만 순환 편집
        if (cellIndex >= 5) { // 매트릭스 데이터 셀들 (6번째부터)
            handleMatrixCellClick(cell);
            return;
        }
    }
    
    // 이미 편집 중인 다른 셀이 있다면 저장
    const currentEditingCell = document.querySelector('.editing-cell');
    if (currentEditingCell && currentEditingCell !== cell) {
        saveCellEdit(currentEditingCell);
    }
    
    // 일반 테이블 셀 편집 모드 시작
    startCellEdit(cell);
}

// 교과목 관리 셀 편집 시작
function startCellEdit(cell) {
    const originalContent = cell.innerHTML;
    cell.setAttribute('data-original-content', originalContent);
    cell.classList.add('editing-cell');
    
    // 편집 가능한 입력 필드 생성 (셀 전체 영역 사용)
    const input = document.createElement('input');
    input.type = 'text';
    input.value = cell.textContent.trim();
    input.className = 'cell-edit-input';
    

    
    // 입력 필드 이벤트 리스너
    input.addEventListener('blur', () => saveCellEdit(cell));
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            saveCellEdit(cell);
        } else if (e.key === 'Escape') {
            cancelCellEdit(cell);
        }
    });
    
    cell.innerHTML = '';
    cell.appendChild(input);
    input.focus();
    input.select();
}

// 매트릭스 셀 클릭 처리 (임시 저장)
function handleMatrixCellClick(cell) {
    
    const originalContent = cell.innerHTML;
    const row = cell.closest('tr');
    
    // 실제 셀 인덱스 계산 (rowSpan 고려)
    const cells = Array.from(row.children);
    const cellIndex = cells.indexOf(cell);
    
    // 매트릭스 데이터 셀인지 확인 (6번째 셀부터)
    if (cellIndex < 5) {
        return;
    }
    
    // 과목명 찾기 (rowSpan 고려하여 실제 위치 계산)
    let courseName = '';
    let course = null;
    
    // 현재 행에서 과목명 셀 찾기
    const nameCell = row.querySelector('td:nth-child(4)');
    if (nameCell) {
        courseName = nameCell.textContent;
        course = courses.find(c => c.courseName === courseName);
    }
    
    
    if (!course) {
        return;
    }
    
    // 순환 편집: 빈 값 → ● → ◐ → 빈 값
    let currentValue = 0;
    if (originalContent.includes('●')) {
        currentValue = 1;
    } else if (originalContent.includes('◐')) {
        currentValue = 0.5;
    }
    
    
    let newMatrixValue = 0;
    let newDisplayContent = '';
    let markClass = '';
    
    // 실제 매트릭스 컬럼 인덱스 계산 (첫 5개 컬럼 제외)
    const matrixColIndex = cellIndex - 5;
    
    if (matrixColIndex >= 0 && matrixColIndex <= 3) {
        markClass = 'matrix-mark-thinking';
    } else if (matrixColIndex >= 4 && matrixColIndex <= 10) {
        markClass = 'matrix-mark-design';
    } else if (matrixColIndex >= 11 && matrixColIndex <= 15) {
        markClass = 'matrix-mark-tech';
    } else if (matrixColIndex >= 16 && matrixColIndex <= 17) {
        markClass = 'matrix-mark-practice';
    }
    
    if (currentValue === 0) {
        newMatrixValue = 1;
        newDisplayContent = `<span class="matrix-mark ${markClass}">●</span>`;
    } else if (currentValue === 1) {
        newMatrixValue = 0.5;
        newDisplayContent = `<span class="matrix-mark ${markClass}">◐</span>`;
    } else {
        newMatrixValue = 0;
        newDisplayContent = '';
    }
    
    
    // 임시 매트릭스 데이터 업데이트
    if (matrixColIndex >= 0 && matrixColIndex < 18) {
        if (!tempMatrixData[courseName]) {
            // 기존 데이터가 있으면 복사, 없으면 새로 생성
            tempMatrixData[courseName] = matrixData[courseName] ? 
                [...matrixData[courseName]] : new Array(18).fill(0);
        }
        tempMatrixData[courseName][matrixColIndex] = newMatrixValue;
        
        // 실제 데이터에도 반영 (임시 데이터는 버전 저장 시 사용)
        if (!matrixData[courseName]) {
            matrixData[courseName] = new Array(18).fill(0);
        }
        matrixData[courseName][matrixColIndex] = newMatrixValue;
    }
    
    // 셀 내용 업데이트
    cell.innerHTML = newDisplayContent;
    
    // 시각적 피드백 (임시로 배경색 변경)
    cell.style.backgroundColor = '#fff3cd';
    setTimeout(() => {
        cell.style.backgroundColor = '';
    }, 300);
    
    showToast('변경사항이 임시 저장되었습니다. 버전 저장 버튼을 눌러주세요.');
}

// 키보드 단축키로 매트릭스 셀 편집
function handleMatrixKeyboardEdit(event) {
    if (!isEditMode) return;
    
    const activeElement = document.activeElement;
    if (!activeElement || !activeElement.closest('#matrixTable')) return;
    
    const cell = activeElement.closest('td');
    if (!cell) return;
    
    const cellIndex = Array.from(cell.parentNode.children).indexOf(cell);
    if (cellIndex < 5) return; // 매트릭스 데이터 셀만 처리
    
    switch(event.key) {
        case '0':
        case ' ':
            // 빈 값으로 설정
            setMatrixCellValue(cell, 0);
            break;
        case '1':
            // 완전 체크로 설정
            setMatrixCellValue(cell, 1);
            break;
        case '2':
        case '5':
            // 부분 체크로 설정
            setMatrixCellValue(cell, 0.5);
            break;
    }
}

// 매트릭스 셀 값 설정
function setMatrixCellValue(cell, value) {
    const row = cell.closest('tr');
    
    // 실제 셀 인덱스 계산 (rowSpan 고려)
    const cells = Array.from(row.children);
    const cellIndex = cells.indexOf(cell);
    
    // 매트릭스 데이터 셀인지 확인 (6번째 셀부터)
    if (cellIndex < 5) {
        return;
    }
    
    // 과목명 찾기 (rowSpan 고려하여 실제 위치 계산)
    let courseName = '';
    let course = null;
    
    // 현재 행에서 과목명 셀 찾기
    const nameCell = row.querySelector('td:nth-child(4)');
    if (nameCell) {
        courseName = nameCell.textContent;
        course = courses.find(c => c.courseName === courseName);
    }
    
    if (!course) return;
    
    let displayContent = '';
    let markClass = '';
    
    // 실제 매트릭스 컬럼 인덱스 계산 (첫 5개 컬럼 제외)
    const matrixColIndex = cellIndex - 5;
    
    if (matrixColIndex >= 0 && matrixColIndex <= 3) {
        markClass = 'matrix-mark-thinking';
    } else if (matrixColIndex >= 4 && matrixColIndex <= 10) {
        markClass = 'matrix-mark-design';
    } else if (matrixColIndex >= 11 && matrixColIndex <= 15) {
        markClass = 'matrix-mark-tech';
    } else if (matrixColIndex >= 16 && matrixColIndex <= 17) {
        markClass = 'matrix-mark-practice';
    }
    
    if (value === 1) {
        displayContent = `<span class="matrix-mark ${markClass}">●</span>`;
    } else if (value === 0.5) {
        displayContent = `<span class="matrix-mark ${markClass}">◐</span>`;
    }
    
    // 매트릭스 데이터 업데이트
    if (matrixColIndex >= 0 && matrixColIndex < 18) {
        // 임시 저장소에 먼저 저장
        if (!tempMatrixData[courseName]) {
            // 기존 데이터가 있으면 복사, 없으면 새로 생성
            tempMatrixData[courseName] = matrixData[courseName] ? 
                [...matrixData[courseName]] : new Array(18).fill(0);
        }
        tempMatrixData[courseName][matrixColIndex] = value;
        
        // 실제 데이터에도 반영 (임시 데이터는 버전 저장 시 사용)
        if (!matrixData[courseName]) {
            matrixData[courseName] = new Array(18).fill(0);
        }
        matrixData[courseName][matrixColIndex] = value;
    }
    
    cell.innerHTML = displayContent;
    renderCourses();
    renderMatrix();
}

// 셀 편집 저장
function saveCellEdit(cell) {
    const input = cell.querySelector('.cell-edit-input');
    if (!input) return;
    
    const newValue = input.value.trim();
    const originalContent = cell.getAttribute('data-original-content');
    
    // 값이 변경되었는지 확인
    if (newValue !== cell.textContent.trim()) {
        // 매트릭스 테이블의 경우 특별한 처리
        if (cell.closest('#matrixTable')) {
            handleMatrixCellEdit(cell, newValue, originalContent);
        } else {
            // 일반 테이블의 경우
            handleCourseTableEdit(cell, newValue, originalContent);
        }
    } else {
        cell.innerHTML = originalContent;
    }
    
    cell.classList.remove('editing-cell');
    cell.removeAttribute('data-original-content');
}

// 교과목 관리 셀 편집 처리 (임시 저장)
function handleCourseTableEdit(cell, newValue, originalContent) {
    const row = cell.closest('tr');
    const courseIndex = Array.from(row.parentNode.children).indexOf(row);
    const cellIndex = Array.from(row.children).indexOf(cell);
    
    // 필터링된 목록에서 원본 인덱스 찾기
    const list = filteredCourses || courses;
    const course = list[courseIndex];
    if (!course) {
        cell.innerHTML = originalContent;
        return;
    }
    
    // 원본 배열에서 해당 교과목 찾기
    const originalIndex = courses.findIndex(c => 
        c.courseName === course.courseName && 
        c.courseNumber === course.courseNumber
    );
    
    if (originalIndex === -1) {
        cell.innerHTML = originalContent;
        return;
    }
    
    // 임시 저장소에 교과목 데이터 복사 (없으면)
    if (tempCourses.length === 0) {
        tempCourses = JSON.parse(JSON.stringify(courses));
    }
    
    // 셀 위치에 따라 업데이트할 필드 결정
    switch(cellIndex) {
        case 0: // 학년-학기
            tempCourses[originalIndex].yearSemester = newValue;
            break;
        case 1: // 교과목번호
            tempCourses[originalIndex].courseNumber = newValue;
            break;
        case 2: // 과목명
            tempCourses[originalIndex].courseName = newValue;
            // 매트릭스 데이터도 임시 업데이트
            if (tempMatrixData[originalContent]) {
                tempMatrixData[newValue] = tempMatrixData[originalContent];
                delete tempMatrixData[originalContent];
            }
            break;
        case 3: // 담당교수
            tempCourses[originalIndex].professor = newValue;
            break;
        case 4: // 학점
            const credits = parseInt(newValue);
            if (isNaN(credits) || credits < 1) {
                cell.innerHTML = originalContent;
                alert('학점은 1 이상의 숫자여야 합니다.');
                return;
            }
            tempCourses[originalIndex].credits = credits;
            break;
        case 5: // 구분 (카테고리)
            if (!['건축적사고', '설계', '기술', '실무', '기타'].includes(newValue)) {
                cell.innerHTML = originalContent;
                alert('구분은 건축적사고, 설계, 기술, 실무, 기타 중 하나여야 합니다.');
                return;
            }
            tempCourses[originalIndex].category = newValue;
            break;
        case 6: // 필수여부
            if (!['필수', '선택'].includes(newValue)) {
                cell.innerHTML = originalContent;
                alert('필수여부는 필수 또는 선택이어야 합니다.');
                return;
            }
            tempCourses[originalIndex].isRequired = newValue;
            break;
        case 7: // 수행평가기준 (편집 불가)
            cell.innerHTML = originalContent;
            return;
        default:
            cell.innerHTML = originalContent;
            return;
    }
    
    // 성공 메시지
    cell.innerHTML = newValue;
    showToast('변경사항이 임시 저장되었습니다. 버전 저장 버튼을 눌러주세요.');
}

// 셀 편집 취소
function cancelCellEdit(cell) {
    const originalContent = cell.getAttribute('data-original-content');
    if (originalContent !== null) {
        cell.innerHTML = originalContent;
    }
    cell.classList.remove('editing-cell');
    cell.removeAttribute('data-original-content');
}

// 매트릭스 셀 편집 처리 (순환 편집)
function handleMatrixCellEdit(cell, newValue, originalContent) {
    const row = cell.closest('tr');
    const courseName = row.querySelector('td:nth-child(4)').textContent;
    const course = courses.find(c => c.courseName === courseName);
    
    if (!course) {
        cell.innerHTML = originalContent;
        return;
    }
    
    // 행/열 인덱스 계산
    const rowIndex = Array.from(row.parentNode.children).indexOf(row);
    const colIndex = Array.from(cell.parentNode.children).indexOf(cell) - 5; // 첫 5개 컬럼 제외
    
    // 순환 편집: 빈 값 → ● → ◐ → 빈 값
    let currentValue = 0;
    if (originalContent.includes('●')) {
        currentValue = 1;
    } else if (originalContent.includes('◐')) {
        currentValue = 0.5;
    }
    
    let newMatrixValue = 0;
    let newDisplayContent = '';
    
    if (currentValue === 0) {
        newMatrixValue = 1;
        newDisplayContent = '<span class="matrix-mark">●</span>';
    } else if (currentValue === 1) {
        newMatrixValue = 0.5;
        newDisplayContent = '<span class="matrix-mark">◐</span>';
    } else {
        newMatrixValue = 0;
        newDisplayContent = '';
    }
    
    // 매트릭스 셀 수정 로그 출력
    
    // 매트릭스 데이터 업데이트 (임시 저장소와 실제 데이터 모두 업데이트)
    if (colIndex >= 0 && colIndex < 18) {
        // 임시 저장소에 먼저 저장
        if (!tempMatrixData[courseName]) {
            // 기존 데이터가 있으면 복사, 없으면 새로 생성
            tempMatrixData[courseName] = matrixData[courseName] ? 
                [...matrixData[courseName]] : new Array(18).fill(0);
        }
        tempMatrixData[courseName][colIndex] = newMatrixValue;
        
        // 실제 데이터에도 반영
        if (!matrixData[courseName]) {
            matrixData[courseName] = new Array(18).fill(0);
        }
        matrixData[courseName][colIndex] = newMatrixValue;
    }
    
    cell.innerHTML = newDisplayContent;
    showToast('변경사항이 임시 저장되었습니다. 버전 저장 버튼을 눌러주세요.');
}

// 디자인 설정 업데이트
function updateTableDesign() {
    const tableBgColor = document.getElementById('tableBgColor').value;
    const headerBgColor = document.getElementById('headerBgColor').value;
    const headerTextColor = document.getElementById('headerTextColor').value;
    const borderColor = document.getElementById('borderColor').value;
    const fontSize = document.getElementById('fontSize').value + 'px';
    const fontFamily = document.getElementById('fontFamily').value;
    const rowHeight = document.getElementById('rowHeight').value + 'px';
    const cellPadding = document.getElementById('cellPadding').value + 'px';
    const borderWidth = document.getElementById('borderWidth').value + 'px';
    const hoverEffect = document.getElementById('hoverEffect').value;
    
    // 값 표시 업데이트
    document.getElementById('fontSizeValue').textContent = fontSize;
    document.getElementById('rowHeightValue').textContent = rowHeight;
    document.getElementById('cellPaddingValue').textContent = cellPadding;
    document.getElementById('borderWidthValue').textContent = borderWidth;
    
    // CSS 변수로 스타일 적용
    const style = document.documentElement.style;
    style.setProperty('--table-bg-color', tableBgColor);
    style.setProperty('--header-bg-color', headerBgColor);
    style.setProperty('--header-text-color', headerTextColor);
    style.setProperty('--border-color', borderColor);
    style.setProperty('--font-size', fontSize);
    style.setProperty('--font-family', fontFamily);
    style.setProperty('--row-height', rowHeight);
    style.setProperty('--cell-padding', cellPadding);
    style.setProperty('--border-width', borderWidth);
    
    // 호버 효과 적용
    applyHoverEffect(hoverEffect);
    
    // 설정 저장
    designSettings = {
        tableBgColor,
        headerBgColor,
        headerTextColor,
        borderColor,
        fontSize,
        fontFamily,
        rowHeight,
        cellPadding,
        borderWidth,
        hoverEffect
    };
}

// 호버 효과 적용
function applyHoverEffect(effect) {
    const tables = document.querySelectorAll('table');
    tables.forEach(table => {
        const rows = table.querySelectorAll('tr');
        rows.forEach(row => {
            row.classList.remove('hover-shadow', 'hover-border', 'hover-none');
            if (effect === 'shadow') {
                row.classList.add('hover-shadow');
            } else if (effect === 'border') {
                row.classList.add('hover-border');
            } else if (effect === 'none') {
                row.classList.add('hover-none');
            }
        });
    });
}

// 디자인 설정 저장
function saveDesignSettings() {
    localStorage.setItem('designSettings', JSON.stringify(designSettings));
    
    // Firebase에 저장
    saveDataToFirebase('settings/design', designSettings);
    
    showToast('디자인 설정이 저장되었습니다.');
}

// 디자인 설정 불러오기
function loadDesignSettings() {
    const saved = localStorage.getItem('designSettings');
    if (saved) {
        designSettings = JSON.parse(saved);
        applyDesignSettings();
    }
}

// 디자인 설정 적용
function applyDesignSettings() {
    document.getElementById('tableBgColor').value = designSettings.tableBgColor;
    document.getElementById('headerBgColor').value = designSettings.headerBgColor;
    document.getElementById('headerTextColor').value = designSettings.headerTextColor;
    document.getElementById('borderColor').value = designSettings.borderColor;
    document.getElementById('fontSize').value = parseInt(designSettings.fontSize);
    document.getElementById('fontFamily').value = designSettings.fontFamily;
    document.getElementById('rowHeight').value = parseInt(designSettings.rowHeight);
    document.getElementById('cellPadding').value = parseInt(designSettings.cellPadding);
    document.getElementById('borderWidth').value = parseInt(designSettings.borderWidth);
    document.getElementById('hoverEffect').value = designSettings.hoverEffect;
    
    updateTableDesign();
}

// 디자인 설정 초기화
function resetDesignSettings() {
    if (confirm('기본 디자인으로 복원하시겠습니까?')) {
        designSettings = {
            tableBgColor: '#ffffff',
            headerBgColor: '#2c3e50',
            headerTextColor: '#ffffff',
            borderColor: '#dee2e6',
            fontSize: '14px',
            fontFamily: "'Noto Sans KR', sans-serif",
            rowHeight: '50px',
            cellPadding: '12px',
            borderWidth: '1px',
            hoverEffect: 'background'
        };
        applyDesignSettings();
        localStorage.removeItem('designSettings');
        alert('기본 디자인으로 복원되었습니다.');
    }
}

// 디자인 설정 내보내기
function exportDesignSettings() {
    const dataStr = JSON.stringify(designSettings, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'design-settings.json';
    link.click();
    URL.revokeObjectURL(url);
}

// 디자인 설정 가져오기
function importDesignSettings() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const settings = JSON.parse(e.target.result);
                    designSettings = settings;
                    applyDesignSettings();
                    alert('디자인 설정을 가져왔습니다.');
                } catch (error) {
                    alert('파일 형식이 올바르지 않습니다.');
                }
            };
            reader.readAsText(file);
        }
    };
    input.click();
}

// 탭 전환
function showTab(tabName, event) {
    // 기존 탭 비활성화
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => tab.classList.remove('active'));
    const contents = document.querySelectorAll('.content');
    contents.forEach(content => content.classList.remove('active'));
    // 선택한 탭 활성화
    document.getElementById(tabName).classList.add('active');
    if (event) event.currentTarget.classList.add('active');

    // 탭 전환 시 모든 수정모드 상태 초기화
    resetAllEditModes();

    // 공통가치대응 탭이면 테이블 렌더링
    if (tabName === 'commonValues') {
        // 셀 편집 중이 아닐 때만 테이블 렌더링
        if (!isCommonValuesCellEditing) {
        renderCommonValuesTable();
        }
        updateCommonValuesFontSize(); // 폰트 크기 동기화
        updateColorLegendCommonValues(); // 색상 범례 업데이트
    }
    
    // 이수모형 탭 클릭 시 변경이력 처리
    if (tabName === 'curriculum') {
        // 변경이력이 있을 때만 모달 팝업 + 표 갱신
        if (Array.isArray(changeHistory) && changeHistory.length > 0) {
            getCurrentDiffSummary();
            showChangeHistoryModal();
            setTimeout(() => {
                renderCurriculumTable();
            }, 100);
        } else {
            getCurrentDiffSummary();
            renderCurriculumTable();
        }
        
        // 색상 기준 스위치 UI 동기화
        const slider = document.getElementById('toggleSliderCurriculum');
        const text = document.getElementById('colorModeTextCurriculum');
        updateColorLegendCurriculum(); // 색상 범례 업데이트
        if (slider && text) {
            if (colorModeBySubjectTypeCurriculum) {
                slider.style.left = '3px';
                slider.style.background = '#6c757d';
                text.textContent = '분야';
            } else {
                slider.style.left = '51px';
                slider.style.background = '#28a745';
                text.textContent = '구분';
            }
        }
        
        // 이동된 교과목이 있으면 화살표 그리기
        setTimeout(() => {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    const movedCoursesForGhost = getMovedCoursesForGhost();
                    if (movedCoursesForGhost.length > 0) {
                        clearMoveArrows();
                        drawMoveArrows(movedCoursesForGhost);
                    }
                });
            });
        }, 0);
    }
    
    // 분석 탭 전환 시 차트 재렌더링
    if (tabName === 'analysis') {
        // 약간의 지연을 두어 DOM 렌더링 완료 후 차트 그리기
        setTimeout(() => {
            drawChart();
            drawSubjectTypeChart();
        }, 100);
    }
    
    // 마지막 탭 정보 저장
    localStorage.setItem('uosLastTab', tabName);
}

// 교과목 테이블 렌더링
function renderCourses() {
    const tbody = document.getElementById('coursesTableBody');
    tbody.innerHTML = '';
    
    // 정렬된 데이터 사용 (필터링된 데이터가 있으면 그것을, 없으면 전체 데이터를)
    const list = filteredCourses || courses;
    
    list.forEach((course, idx) => {
        // 원본 배열에서의 인덱스 찾기
        const originalIndex = courses.findIndex(c => c === course);
        
        // 매트릭스 데이터 가져오기
        const matrixValues = matrixData[course.courseName] || new Array(18).fill(0);
        const performanceCriteria = getPerformanceCriteria(matrixValues);
        
        const row = tbody.insertRow();
        row.innerHTML = `
            <td class="no-edit">${course.yearSemester}</td>
            <td class="no-edit">${course.courseNumber}</td>
            <td><strong ondblclick="editCourse(${originalIndex})">${course.courseName}</strong></td>
            <td>${course.professor || '-'}</td>
            <td class="no-edit">${course.credits}</td>
            <td class="no-edit">
                <span class="category-badge badge-${getCategoryClass(course.category)}">${course.category}</span>
            </td>
            <td class="no-edit">
                <span class="subject-type-badge badge-${getSubjectTypeClass(course.subjectType)}">${course.subjectType}</span>
            </td>
            <td class="no-edit">${course.isRequired}</td>
            <td class="performance-criteria no-edit" title="${performanceCriteria.fullText}">${performanceCriteria.detailedText}</td>
            <td class="no-edit">
                <button class="btn btn-sm" onclick="editCourse(${originalIndex})" style="font-size: 12px; padding: 5px 10px;">수정</button>
                <button class="btn btn-sm btn-secondary" onclick="deleteCourse(${originalIndex})" style="font-size: 12px; padding: 5px 10px;">삭제</button>
            </td>
        `;
        // 수행평가기준 컬럼에 HTML 적용
        const criteriaCell = row.querySelector('.performance-criteria');
        if (criteriaCell) {
            criteriaCell.innerHTML = performanceCriteria.detailedText;
        }
    });
    
    // 호버 효과 재적용
    if (designSettings.hoverEffect) {
        applyHoverEffect(designSettings.hoverEffect);
    }
    
    // 수정모드가 활성화되어 있다면 셀 편집 기능 활성화
    if (isEditMode) {
        enableCellEditing();
    }
    
    // 컬럼 리사이즈 기능 초기화
    initCoursesTableResize();
    
    // 정렬 이벤트 리스너 초기화 (한 번만)
    if (!window.sortListenersInitialized) {
        initSortListeners();
        window.sortListenersInitialized = true;
    }
}

// 카테고리별 클래스 반환
function getCategoryClass(category) {
    switch(category) {
        case '교양': return 'category-liberal';
        case '건축적사고': return 'category-thinking';
        case '설계': return 'category-design';
        case '기술': return 'category-tech';
        case '실무': return 'category-practice';
        case '기타': return 'category-etc';
        default: return '';
    }
}

// 교과목 필터링
function filterCourses() {
    const yearFilter = document.getElementById('yearFilter').value;
    const semesterFilter = document.getElementById('semesterFilter').value;
    const categoryFilter = document.getElementById('categoryFilter').value;
    const subjectTypeFilter = document.getElementById('subjectTypeFilter').value;
    const searchInput = document.getElementById('searchInput').value.toLowerCase();
    
    filteredCourses = courses.filter(course => {
        const [year, semester] = course.yearSemester.split('-');
        const matchesYear = !yearFilter || year === yearFilter;
        const matchesSemester = !semesterFilter || semester === semesterFilter;
        const matchesCategory = !categoryFilter || course.category === categoryFilter;
        const matchesSubjectType = !subjectTypeFilter || course.subjectType === subjectTypeFilter;
        const matchesSearch = !searchInput || 
            course.courseName.toLowerCase().includes(searchInput) ||
            course.professor.toLowerCase().includes(searchInput) ||
            course.courseNumber.toLowerCase().includes(searchInput);
        
        return matchesYear && matchesSemester && matchesCategory && matchesSubjectType && matchesSearch;
    });
    
    renderCourses();
    updateStats();
}

// 필터 초기화
function resetFilters() {
    document.getElementById('yearFilter').value = '';
    document.getElementById('semesterFilter').value = '';
    document.getElementById('categoryFilter').value = '';
    document.getElementById('subjectTypeFilter').value = '';
    document.getElementById('searchInput').value = '';
    filteredCourses = null;
    
    // 정렬 상태도 초기화
    currentSortColumn = null;
    currentSortDirection = 'asc';
    
    // 정렬 아이콘 초기화
    const table = document.getElementById('coursesTable');
    if (table) {
        const headers = table.querySelectorAll('th.sortable');
        headers.forEach(header => {
            header.classList.remove('asc', 'desc');
        });
    }
    
    // 화살표 초기화
    clearMoveArrows();
}

// 교과목 수정
function editCourse(index) {
    editingIndex = index;
    const course = courses[index];
    const form = document.getElementById('courseForm');
    // 학년-학기 분리
    const [year, semester] = course.yearSemester.split('-');
    form.year.value = year;
    form.semester.value = semester;
    form.courseNumber.value = course.courseNumber;
    form.courseName.value = course.courseName;
    form.credits.value = course.credits;
    form.category.value = course.category;
    form.subjectType.value = course.subjectType;
    form.isRequired.value = course.isRequired;
    form.professor.value = course.professor || '';
    form.description.value = course.description || '';
    // 모달 제목 항상 '교과목 수정'
    document.querySelector('.modal-header h2').textContent = '교과목 수정';
    // 수행평가기준 리스트 표시
    const matrixValues = matrixData[course.courseName] || new Array(18).fill(0);
    const criteriaNames = [
        '건축과 예술 및 과학기술', '세계 건축의 역사와 문화', '한국 건축과 전통', '건축과 사회',
        '형태 및 공간구성', '대지와 외부공간 계획', '안전 설계', '건축재료와 구성방법',
        '건물시스템 통합설계', '건축과 도시설계', '연구기반 종합설계', '구조원리',
        '구조시스템', '환경조절 시스템', '건축설비 시스템', '시공 및 건설관리',
        '프로젝트수행과 건축사무소운영', '건축사법과 건축법 및 관계법령'
    ];
    let listHtml = '<ul style="margin:0; padding-left:18px;">';
    let hasAny = false;
    matrixValues.forEach((value, idx) => {
        if (value > 0) {
            hasAny = true;
            if (value === 1) {
                listHtml += `<li><b>${idx+1}. ${criteriaNames[idx]}</b></li>`;
            } else {
                listHtml += `<li><span class='criteria-partial'>${idx+1}. ${criteriaNames[idx]}</span></li>`;
            }
        }
    });
    if (!hasAny) listHtml += '<li style="color:#bbb;">없음</li>';
    listHtml += '</ul>';
    const criteriaDiv = document.getElementById('coursePerformanceCriteria');
    if (criteriaDiv) criteriaDiv.innerHTML = listHtml;
    showModal();
}

// 교과목 삭제
function deleteCourse(index) {
    const course = courses[index];
    if (confirm(`'${course.courseName}' 과목을 정말 삭제하시겠습니까?`)) {
        // 공통가치대응 표의 셀 데이터 보존
        const currentCommonValuesData = collectCommonValuesTableData();
        
        // 삭제 이력 기록
        addChangeHistory('삭제', course.courseName, Object.keys(course).map(k => ({field: k, before: course[k], after: ''})));
        courses.splice(index, 1);
        
        // 공통가치대응 표의 셀 데이터 복원
        commonValuesCellTexts = currentCommonValuesData;
        
        renderCourses();
        renderMatrix();
        // 셀 편집 중이 아닐 때만 테이블 렌더링
        if (!isCommonValuesCellEditing) {
        renderCommonValuesTable(); // 공통가치대응 탭도 즉시 갱신
        }
        updateStats();
        alert('교과목이 삭제되었습니다.');
        renderChangeHistoryPanel();
        
        // 화살표 즉시 업데이트
        setTimeout(() => {
            const movedCoursesForGhost = getMovedCoursesForGhost();
            drawMoveArrows(movedCoursesForGhost);
        }, 10);
    }
}

// 통계 업데이트
function updateStats() {
    // 삭제된 교과목과 고스트 블록을 제외한 활성 교과목만 필터링
    const activeCourses = courses.filter(course => {
        // 삭제된 교과목 제외
        const isDeleted = course.isDeleted === true;
        // 고스트 블록 제외 (원래 위치에서 이동된 교과목의 흔적)
        const isGhost = course.isGhost === true;
        return !isDeleted && !isGhost;
    });
    
    const categoryStats = {
        '교양': activeCourses.filter(c => c.category === '교양').length,
        '건축적사고': activeCourses.filter(c => c.category === '건축적사고').length,
        '설계': activeCourses.filter(c => c.category === '설계').length,
        '기술': activeCourses.filter(c => c.category === '기술').length,
        '실무': activeCourses.filter(c => c.category === '실무').length,
        '기타': activeCourses.filter(c => c.category === '기타').length
    };
    
    // 분석 및 통계 탭의 통계 업데이트
    const totalCreditsEl = document.getElementById('totalCredits');
    const requiredCoursesEl = document.getElementById('requiredCourses');
    const electiveCoursesEl = document.getElementById('electiveCourses');
    const designCoursesEl = document.getElementById('designCourses');
    const designRatioEl = document.getElementById('designRatio');
    
    if (totalCreditsEl) {
        const totalCredits = activeCourses.reduce((sum, course) => sum + course.credits, 0);
        totalCreditsEl.textContent = totalCredits;
    }
    
    if (requiredCoursesEl) {
        const requiredCount = activeCourses.filter(c => c.isRequired === '필수').length;
        requiredCoursesEl.textContent = requiredCount;
    }
    
    if (electiveCoursesEl) {
        const electiveCount = activeCourses.filter(c => c.isRequired === '선택').length;
        electiveCoursesEl.textContent = electiveCount;
    }
    
    if (designCoursesEl) {
        const designCount = activeCourses.filter(c => c.category === '설계').length;
        designCoursesEl.textContent = designCount;
    }
    
    if (designRatioEl) {
        const designCount = activeCourses.filter(c => c.category === '설계').length;
        const ratio = activeCourses.length > 0 ? Math.round((designCount / activeCourses.length) * 100) : 0;
        designRatioEl.textContent = ratio + '%';
    }
    
    drawChart();
    drawSubjectTypeChart();
}

// 매트릭스 테이블 렌더링 (카테고리별 그룹화 반영, 학년-학기 순 정렬)
function renderMatrix() {
    // 매트릭스 제목 업데이트
    const titleElement = document.getElementById('matrixTitle');
    if (titleElement) {
        const savedTitle = localStorage.getItem('matrixTitleText');
        if (savedTitle) {
            titleElement.textContent = savedTitle;
        } else {
            titleElement.textContent = '수행평가 매트릭스';
        }
    }
    
    const tbody = document.getElementById('matrixTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    // 필터링된 데이터 사용
    const coursesToRender = filteredMatrixCourses || courses;
    
    const coursesByCategory = {
        '건축적사고': [],
        '설계': [],
        '기술': [],
        '실무': []
    };
    coursesToRender.forEach(course => {
        // 교양과목은 매트릭스에서 제외
        if (course.category === '교양') {
            return;
        }
        if (coursesByCategory[course.category]) {
            coursesByCategory[course.category].push(course);
        }
    });
    
    // 각 카테고리 내에서 학년-학기 순으로 정렬
    Object.keys(coursesByCategory).forEach(category => {
        coursesByCategory[category].sort((a, b) => {
            const [aYear, aSemester] = a.yearSemester.split('-');
            const [bYear, bSemester] = b.yearSemester.split('-');
            
            // 학년 비교
            if (aYear !== bYear) {
                return parseInt(aYear) - parseInt(bYear);
            }
            
            // 학기 비교 (1학기 < 2학기 < 계절학기)
            const semesterOrder = { '1': 1, '2': 2, '계절': 3 };
            return semesterOrder[aSemester] - semesterOrder[bSemester];
        });
    });
    
    Object.entries(coursesByCategory).forEach(([category, categoryCourses]) => {
        if (categoryCourses.length === 0) return;
        categoryCourses.forEach((course, index) => {
            const row = tbody.insertRow();
            const categoryClass = getCategoryClass(course.category);
            row.classList.add(`category-${categoryClass}`);
            if (course.isRequired === '필수') row.classList.add('major-required-row');

            // 카테고리 셀: 첫 행만 실제 값, 나머지는 숨김셀
            if (index === 0) {
                const categoryCell = row.insertCell();
                categoryCell.textContent = category;
                categoryCell.rowSpan = categoryCourses.length;
                categoryCell.style.fontWeight = 'bold';
                categoryCell.style.textAlign = 'center';
                categoryCell.style.verticalAlign = 'middle';
            } else {
                // 숨김셀 추가
                const hiddenCell = row.insertCell();
                hiddenCell.style.display = 'none';
            }

            // 이하 기존과 동일하게 셀 추가
            const yearSemCell = row.insertCell();
            yearSemCell.textContent = course.yearSemester;
            const numCell = row.insertCell();
            numCell.textContent = course.courseNumber;
            const nameCell = row.insertCell();
            nameCell.textContent = course.courseName;
            nameCell.style.cursor = 'pointer';
            nameCell.title = ``;
            nameCell.addEventListener('mouseenter', (e) => showCourseTooltip(e, course));
            nameCell.addEventListener('mouseleave', hideCourseTooltip);
            nameCell.addEventListener('mousemove', moveCourseTooltip);
            nameCell.onclick = () => editCourseFromMatrix(course);
            nameCell.classList.add('no-edit');
            
            // 교과목 변경 상태에 따른 색상 적용
            const diffSummary = getCurrentDiffSummary();
            const courseDiff = diffSummary.find(diff => diff.course.id === course.id);
            if (courseDiff) {
                if (courseDiff.type === '추가') {
                    nameCell.classList.add('course-added');
                } else if (courseDiff.type === '삭제') {
                    nameCell.classList.add('course-deleted');
                } else if (courseDiff.type === '수정') {
                    nameCell.classList.add('course-modified');
                }
            }
            const creditsCell = row.insertCell();
            creditsCell.textContent = course.credits;
            creditsCell.style.textAlign = 'center';

            // 매트릭스 데이터 셀들 추가
            const matrixValues = matrixData[course.courseName] || new Array(18).fill(0);
            matrixValues.forEach((value, colIndex) => {
                const cell = row.insertCell();
                let markClass = '';
                if (colIndex >= 0 && colIndex <= 3) {
                    markClass = 'matrix-mark-thinking';
                } else if (colIndex >= 4 && colIndex <= 10) {
                    markClass = 'matrix-mark-design';
                } else if (colIndex >= 11 && colIndex <= 15) {
                    markClass = 'matrix-mark-tech';
                } else if (colIndex >= 16 && colIndex <= 17) {
                    markClass = 'matrix-mark-practice';
                }
                if (value === 1) {
                    cell.innerHTML = `<span class=\"matrix-mark ${markClass}\">●</span>`;
                } else if (value === 0.5) {
                    cell.innerHTML = `<span class=\"matrix-mark ${markClass}\">◐</span>`;
                } else {
                    cell.innerHTML = '';
                }
                cell.setAttribute('data-course-name', course.courseName);
                cell.setAttribute('data-col-index', colIndex);
                cell.addEventListener('click', function() {
                    if (isEditModeMatrix) {
                        handleMatrixCellClickSimple(this);
                    }
                });
                const headerCell = document.querySelector(`#matrixTable thead tr:last-child th:nth-child(${colIndex + 6})`);
                if (headerCell && headerCell.style.width) {
                    cell.style.width = headerCell.style.width;
                    cell.style.minWidth = headerCell.style.minWidth;
                    cell.style.maxWidth = headerCell.style.maxWidth;
                }
            });
            // 전공필수여부 셀 추가
            const requiredCell = row.insertCell();
            if (course.isRequired === '필수') {
                requiredCell.innerHTML = '<span class="major-required-dot">●</span>';
            } else {
                requiredCell.innerHTML = '';
            }
            requiredCell.style.textAlign = 'center';
            requiredCell.classList.add('no-edit');
            // 수정모드에서 클릭 시 토글
            if (isEditModeMatrix) {
                requiredCell.style.cursor = 'pointer';
                requiredCell.onclick = function() {
                    course.isRequired = (course.isRequired === '필수') ? '선택' : '필수';
                    renderMatrix();
                    renderCourses(); // 교과목 관리 탭도 동기화
                    updateStats();
                };
            } else {
                requiredCell.onclick = null;
                requiredCell.style.cursor = '';
            }
        });
    });
    
    // 호버 효과 재적용
    if (designSettings.hoverEffect) {
        applyHoverEffect(designSettings.hoverEffect);
    }
    
    // 수정모드가 활성화되어 있다면 셀 편집 기능 활성화
    if (isEditMode) {
        enableCellEditing();
    }
}

// 차트 그리기
function drawChart() {
    const canvas = document.getElementById('chartCanvas');
    if (!canvas) return;
    
    // 캔버스 크기 동적 조절 - 지연 실행으로 컨테이너 크기 확정 후 계산
    const container = canvas.parentElement;
    if (!container) return;
    
    // 컨테이너가 보이지 않는 경우 지연 실행
    if (container.offsetWidth === 0) {
        setTimeout(() => drawChart(), 100);
        return;
    }
    
    const containerWidth = container.clientWidth - 40; // 패딩 고려
    canvas.width = containerWidth;
    canvas.height = 400;
    
    const ctx = canvas.getContext('2d');
    const categories = ['건축적사고', '설계', '기술', '실무', '기타'];
    
    // 삭제된 교과목과 고스트 블록을 제외한 활성 교과목만 필터링
    const activeCourses = courses.filter(course => {
        const isDeleted = course.isDeleted === true;
        const isGhost = course.isGhost === true;
        return !isDeleted && !isGhost;
    });
    
    // 과목수와 학점수 계산
    const data = [
        activeCourses.filter(c => c.category === '건축적사고').length,
        activeCourses.filter(c => c.category === '설계').length,
        activeCourses.filter(c => c.category === '기술').length,
        activeCourses.filter(c => c.category === '실무').length,
        activeCourses.filter(c => c.category === '기타').length
    ];
    
    const creditsData = [
        activeCourses.filter(c => c.category === '건축적사고').reduce((sum, c) => sum + (parseInt(c.credits) || 0), 0),
        activeCourses.filter(c => c.category === '설계').reduce((sum, c) => sum + (parseInt(c.credits) || 0), 0),
        activeCourses.filter(c => c.category === '기술').reduce((sum, c) => sum + (parseInt(c.credits) || 0), 0),
        activeCourses.filter(c => c.category === '실무').reduce((sum, c) => sum + (parseInt(c.credits) || 0), 0),
        activeCourses.filter(c => c.category === '기타').reduce((sum, c) => sum + (parseInt(c.credits) || 0), 0)
    ];
    
    const colors = ['#1976d2', '#d32f2f', '#f57c00', '#388e3c', '#7b1fa2'];
    const availableWidth = canvas.width - 200; // 좌우 여백 100px씩
    const barSpacing = Math.max(20, availableWidth * 0.05); // 최소 20px, 전체 폭의 5%
    const barWidth = Math.max(60, (availableWidth - (data.length - 1) * barSpacing) / data.length);
    const totalWidth = data.length * barWidth + (data.length - 1) * barSpacing;
    const startX = (canvas.width - totalWidth) / 2;
    const maxHeight = 250;
    const maxValue = Math.max(...data, 1);
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    data.forEach((value, index) => {
        const barHeight = (value / maxValue) * maxHeight;
        const x = startX + index * (barWidth + barSpacing);
        const y = canvas.height - 100 - barHeight;
        
        ctx.fillStyle = colors[index];
        ctx.fillRect(x, y, barWidth, barHeight);
        
        ctx.fillStyle = '#2c3e50';
        ctx.font = 'bold 16px Noto Sans KR';
        // 과목수와 학점수를 줄바꿈해서 표시
        const subjectText = `${value}과목`;
        const creditText = `(${creditsData[index]}학점)`;
        const subjectTextWidth = ctx.measureText(subjectText).width;
        const creditTextWidth = ctx.measureText(creditText).width;
        const maxTextWidth = Math.max(subjectTextWidth, creditTextWidth);
        
        ctx.fillText(subjectText, x + barWidth/2 - subjectTextWidth/2, y - 25);
        ctx.fillText(creditText, x + barWidth/2 - creditTextWidth/2, y - 8);
        
        ctx.font = 'bold 16px Noto Sans KR';
        const categoryText = categories[index];
        const categoryTextWidth = ctx.measureText(categoryText).width;
        ctx.fillText(categoryText, x + barWidth/2 - categoryTextWidth/2, canvas.height - 75);
    });
}

// 과목별분류 차트 그리기
function drawSubjectTypeChart() {
    const canvas = document.getElementById('subjectTypeChartCanvas');
    if (!canvas) return;
    
    // 캔버스 크기 동적 조절 - 지연 실행으로 컨테이너 크기 확정 후 계산
    const container = canvas.parentElement;
    if (!container) return;
    
    // 컨테이너가 보이지 않는 경우 지연 실행
    if (container.offsetWidth === 0) {
        setTimeout(() => drawSubjectTypeChart(), 100);
        return;
    }
    
    const containerWidth = container.clientWidth - 40; // 패딩 고려
    canvas.width = containerWidth;
    canvas.height = 400;
    
    const ctx = canvas.getContext('2d');
    
    // 삭제된 교과목과 고스트 블록을 제외한 활성 교과목만 필터링
    const activeCourses = courses.filter(course => {
        const isDeleted = course.isDeleted === true;
        const isGhost = course.isGhost === true;
        return !isDeleted && !isGhost;
    });
    
    // 과목별분류 목록 (실제 데이터에서 추출)
    const subjectTypes = [...new Set(activeCourses.map(c => c.subjectType))].filter(type => type && type.trim() !== '');
    const categories = subjectTypes.length > 0 ? subjectTypes : ['이론', '설계', '기술', '디지털', '역사', '사회', '도시', '실무'];
    
    // 과목수와 학점수 계산
    const data = categories.map(type => 
        activeCourses.filter(c => c.subjectType === type).length
    );
    
    const creditsData = categories.map(type => 
        activeCourses.filter(c => c.subjectType === type).reduce((sum, c) => sum + (parseInt(c.credits) || 0), 0)
    );
    
    const colors = ['#1976d2', '#d32f2f', '#f57c00', '#388e3c', '#7b1fa2', '#c2185b', '#ff6f00', '#2e7d32', '#1565c0', '#d84315'];
    const availableWidth = canvas.width - 200; // 좌우 여백 100px씩
    const barSpacing = Math.max(15, availableWidth * 0.03); // 최소 15px, 전체 폭의 3%
    const barWidth = Math.max(50, (availableWidth - (categories.length - 1) * barSpacing) / categories.length);
    const totalWidth = categories.length * barWidth + (categories.length - 1) * barSpacing;
    const startX = (canvas.width - totalWidth) / 2;
    const maxHeight = 250;
    const maxValue = Math.max(...data, 1);
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    data.forEach((value, index) => {
        const barHeight = (value / maxValue) * maxHeight;
        const x = startX + index * (barWidth + barSpacing);
        const y = canvas.height - 100 - barHeight;
        
        ctx.fillStyle = colors[index % colors.length];
        ctx.fillRect(x, y, barWidth, barHeight);
        
        ctx.fillStyle = '#2c3e50';
        ctx.font = 'bold 16px Noto Sans KR';
        // 과목수와 학점수를 줄바꿈해서 표시
        const subjectText = `${value}과목`;
        const creditText = `(${creditsData[index]}학점)`;
        const subjectTextWidth = ctx.measureText(subjectText).width;
        const creditTextWidth = ctx.measureText(creditText).width;
        
        ctx.fillText(subjectText, x + barWidth/2 - subjectTextWidth/2, y - 25);
        ctx.fillText(creditText, x + barWidth/2 - creditTextWidth/2, y - 8);
        
        ctx.font = 'bold 16px Noto Sans KR';
        // 긴 텍스트는 줄바꿈 처리
        const categoryText = categories[index];
        if (categoryText.length > 4) {
            const midPoint = Math.ceil(categoryText.length / 2);
            const firstLine = categoryText.substring(0, midPoint);
            const secondLine = categoryText.substring(midPoint);
            const firstLineWidth = ctx.measureText(firstLine).width;
            const secondLineWidth = ctx.measureText(secondLine).width;
            ctx.fillText(firstLine, x + barWidth/2 - firstLineWidth/2, canvas.height - 75);
            ctx.fillText(secondLine, x + barWidth/2 - secondLineWidth/2, canvas.height - 60);
        } else {
            const categoryTextWidth = ctx.measureText(categoryText).width;
            ctx.fillText(categoryText, x + barWidth/2 - categoryTextWidth/2, canvas.height - 75);
        }
    });
    
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(50, canvas.height - 100);
    ctx.lineTo(canvas.width - 50, canvas.height - 100);
    ctx.stroke();
}

// 모달 관련 함수
function showModal() {
    document.getElementById('courseModal').style.display = 'block';
    document.body.classList.add('modal-open');
    // 모달 제목 항상 '교과목 수정'으로 고정
    document.querySelector('.modal-header h2').textContent = '교과목 수정';
}
function closeModal() {
    document.getElementById('courseModal').style.display = 'none';
    document.getElementById('courseForm').reset();
    document.querySelector('.modal-header h2').textContent = '교과목 추가';
    editingIndex = -1;
}

// 교과목 추가/수정 처리
function handleCourseSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const form = e.target;
    // 학년-학기 조합
    const year = formData.get('year');
    const semester = formData.get('semester');
    const yearSemester = `${year}-${semester}`;
    const course = {
        yearSemester: `${form.year.value}-${form.semester.value}`,
        courseNumber: form.courseNumber.value,
        courseName: form.courseName.value,
        credits: parseInt(form.credits.value),
        category: form.category.value,
        subjectType: form.subjectType.value,
        isRequired: form.isRequired.value,
        professor: form.professor.value,
        description: form.description.value
    };
    
    // 기존 course 객체가 있으면 id 복사
    if (typeof editingIndex !== 'undefined' && editingIndex !== null && courses[editingIndex] && courses[editingIndex].id) {
        course.id = courses[editingIndex].id;
    } else if (!course.id) {
        course.id = generateUniqueId();
    }
    
    if (editingIndex === -1) {
        courses.push(course);
        // 새 교과목에 대한 매트릭스 데이터 초기화
        matrixData[course.courseName] = new Array(18).fill(0);
        // 추가 이력 기록
        addChangeHistory('추가', course.courseName, Object.keys(course).map(k => ({field: k, before: '', after: course[k]})));
        alert('교과목이 추가되었습니다.');
    } else {
        const oldCourse = courses[editingIndex];
        const oldCourseName = oldCourse.courseName;
        // 변경된 필드만 추출
        const changes = [];
        for (const key of Object.keys(course)) {
            if (course[key] !== oldCourse[key]) {
                changes.push({field: key, before: oldCourse[key], after: course[key]});
            }
        }
        if (changes.length > 0) {
            addChangeHistory('수정', oldCourse.courseName, changes);
        }
        courses[editingIndex] = course;
        // 과목명이 변경된 경우 매트릭스 데이터도 업데이트
        if (oldCourseName !== course.courseName) {
            if (matrixData[oldCourseName]) {
                matrixData[course.courseName] = matrixData[oldCourseName];
                delete matrixData[oldCourseName];
            } else {
                matrixData[course.courseName] = new Array(18).fill(0);
            }
        }
        alert('교과목이 수정되었습니다.');
        editingIndex = -1;
    }
    resetFilters();
    renderCourses();
    renderMatrix();
    renderCurriculumTable(); // 이수모형표 업데이트 추가
    // 셀 편집 중이 아닐 때만 테이블 렌더링
    if (!isCommonValuesCellEditing) {
    renderCommonValuesTable(); // 공통가치대응표 업데이트 추가
    }
    updateStats();
    closeModal();
    renderChangeHistoryPanel();
    
    // 새로 생성된 교과목 블록에 현재 설정된 글씨 크기 적용
    setTimeout(() => {
        updateCurriculumFontSize();
        
        // 화살표 즉시 업데이트
        const movedCoursesForGhost = getMovedCoursesForGhost();
        drawMoveArrows(movedCoursesForGhost);
    }, 100);
}

// 컬럼 리사이즈 기능 초기화 (최소폭 제한 없이 텍스트에 맞게)
function initColumnResize() {
    const table = document.getElementById('matrixTable');
    if (!table) return;
    // 기존 리사이저 제거
    const existingResizers = table.querySelectorAll('.column-resizer');
    existingResizers.forEach(r => r.remove());
    const resizableHeaders = table.querySelectorAll('th.resizable');
    resizableHeaders.forEach((th, index) => {
        const resizer = document.createElement('div');
        resizer.className = 'column-resizer';
        th.appendChild(resizer);
        let startX = 0;
        let startWidth = 0;
        let currentTh = th;
        let isResizing = false;
        resizer.addEventListener('mousedown', function(e) {
            e.preventDefault();
            e.stopPropagation();
            startX = e.pageX;
            startWidth = currentTh.offsetWidth;
            isResizing = true;
            document.body.classList.add('resizing');
            resizer.classList.add('active');
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        });
        function handleMouseMove(e) {
            if (!isResizing) return;
            const diff = e.pageX - startX;
            const newWidth = Math.max(10, startWidth + diff); // 최소 10px
            // 해당 컬럼의 모든 셀 너비 조정
            const colIndex = Array.from(currentTh.parentNode.children).indexOf(currentTh);
            const allCells = table.querySelectorAll(`tbody tr td:nth-child(${colIndex + 1})`);
            allCells.forEach(cell => {
                cell.style.width = newWidth + 'px';
                cell.style.minWidth = 'unset';
                cell.style.maxWidth = 'unset';
            });
            currentTh.style.width = newWidth + 'px';
            currentTh.style.minWidth = 'unset';
            currentTh.style.maxWidth = 'unset';
        }
        function handleMouseUp() {
            isResizing = false;
            document.body.classList.remove('resizing');
            resizer.classList.remove('active');
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        }
    });
}

// 교과목 관리 테이블 컬럼 리사이즈 기능 초기화
function initCoursesTableResize() {
    const table = document.getElementById('coursesTable');
    if (!table) return;
    
    // 기존 리사이저 제거
    const existingResizers = table.querySelectorAll('.column-resizer');
    existingResizers.forEach(r => r.remove());
    
    const resizableHeaders = table.querySelectorAll('th.resizable');
    resizableHeaders.forEach((th, index) => {
        const resizer = document.createElement('div');
        resizer.className = 'column-resizer';
        th.appendChild(resizer);
        
        let startX = 0;
        let startWidth = 0;
        let currentTh = th;
        let isResizing = false;
        
        resizer.addEventListener('mousedown', function(e) {
            e.preventDefault();
            e.stopPropagation();
            startX = e.pageX;
            startWidth = currentTh.offsetWidth;
            isResizing = true;
            document.body.classList.add('resizing');
            resizer.classList.add('active');
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        });
        
        function handleMouseMove(e) {
            if (!isResizing) return;
            const diff = e.pageX - startX;
            const newWidth = Math.max(50, startWidth + diff); // 최소 50px
            
            // 해당 컬럼의 모든 셀 너비 조정
            const colIndex = Array.from(currentTh.parentNode.children).indexOf(currentTh);
            const allCells = table.querySelectorAll(`tbody tr td:nth-child(${colIndex + 1})`);
            allCells.forEach(cell => {
                cell.style.width = newWidth + 'px';
                cell.style.minWidth = 'unset';
                cell.style.maxWidth = 'unset';
            });
            currentTh.style.width = newWidth + 'px';
            currentTh.style.minWidth = 'unset';
            currentTh.style.maxWidth = 'unset';
        }
        
        function handleMouseUp() {
            isResizing = false;
            document.body.classList.remove('resizing');
            resizer.classList.remove('active');
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        }
    });
}

// 모달 외부 클릭 시 닫기
window.onclick = function(event) {
    const modal = document.getElementById('courseModal');
    if (event.target === modal) {
        closeModal();
    }
}

// 페이지 로드 시 초기화
window.onload = function() {
    // 교과목 추가/수정 폼 이벤트 리스너
    const courseForm = document.getElementById('courseForm');
    if (courseForm) {
        courseForm.addEventListener('submit', handleCourseSubmit);
    }
    // 탭 버튼 이벤트 리스너
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function(e) {
            const tabName = this.getAttribute('onclick').match(/'(.*?)'/)[1];
            showTab(tabName, e);
        });
    });
    // 필터 이벤트 리스너
    document.getElementById('yearFilter').addEventListener('change', filterCourses);
    document.getElementById('semesterFilter').addEventListener('change', filterCourses);
    document.getElementById('categoryFilter').addEventListener('change', filterCourses);
    document.getElementById('subjectTypeFilter').addEventListener('change', filterCourses);
    document.getElementById('searchInput').addEventListener('keyup', filterCourses);
    init();
    initColumnResize();
    updateFontSize(); // 폰트 사이즈 초기화
    // 매트릭스 탭을 기본으로 표시
    showTab('matrix');
    // 창 크기 변경 시 매트릭스 컬럼 폭 재조정
    window.addEventListener('resize', function() {
        if (document.getElementById('matrix').classList.contains('active')) {
            setTimeout(() => {
                initColumnResize();
            }, 100);
        }
    });
    // 최초 로딩 시 버전 버튼 숨김
    const verBtn1 = document.querySelector('button[onclick="showMatrixVersionSaveModal()"]');
    const verBtn2 = document.querySelector('button[onclick="showMatrixVersionManager()"]');
    if (verBtn1) verBtn1.style.display = 'none';
    if (verBtn2) verBtn2.style.display = 'none';
    // 최초 로딩 시 제목 불러오기 및 이벤트 연결
    window.addEventListener('DOMContentLoaded', function() {
        const title = document.getElementById('matrixTitle');
        if (title) {
            const saved = localStorage.getItem('matrixTitleText');
            if (saved) title.textContent = saved;
            title.addEventListener('input', handleMatrixTitleInput);
            setMatrixTitleEditable(false);
        }
    });
};

// 매트릭스에서 교과목 수정
function editCourseFromMatrix(course) {
    // id 기준으로 editingIndex 찾기 (교과목명 변경에도 id 유지)
    editingIndex = courses.findIndex(c => c.id === course.id);
    const form = document.getElementById('courseForm');
    // 학년-학기 분리
    const [year, semester] = course.yearSemester.split('-');
    form.year.value = year;
    form.semester.value = semester;
    form.courseNumber.value = course.courseNumber;
    form.courseName.value = course.courseName;
    form.credits.value = course.credits;
    form.category.value = course.category;
    form.subjectType.value = course.subjectType;
    form.isRequired.value = course.isRequired;
    form.professor.value = course.professor || '';
    form.description.value = course.description || '';
    // 수행평가기준 리스트 표시 (editCourse와 동일하게)
    const matrixValues = matrixData[course.courseName] || new Array(18).fill(0);
    const criteriaNames = [
        '건축과 예술 및 과학기술', '세계 건축의 역사와 문화', '한국 건축과 전통', '건축과 사회',
        '형태 및 공간구성', '대지와 외부공간 계획', '안전 설계', '건축재료와 구성방법',
        '건물시스템 통합설계', '건축과 도시설계', '연구기반 종합설계', '구조원리',
        '구조시스템', '환경조절 시스템', '건축설비 시스템', '시공 및 건설관리',
        '프로젝트수행과 건축사무소운영', '건축사법과 건축법 및 관계법령'
    ];
    let listHtml = '<ul style="margin:0; padding-left:18px;">';
    let hasAny = false;
    matrixValues.forEach((value, idx) => {
        if (value > 0) {
            hasAny = true;
            if (value === 1) {
                listHtml += `<li><b>${idx+1}. ${criteriaNames[idx]}</b></li>`;
            } else {
                listHtml += `<li><span class='criteria-partial'>${idx+1}. ${criteriaNames[idx]}</span></li>`;
            }
        }
    });
    if (!hasAny) listHtml += '<li style="color:#bbb;">없음</li>';
    listHtml += '</ul>';
    const criteriaDiv = document.getElementById('coursePerformanceCriteria');
    if (criteriaDiv) criteriaDiv.innerHTML = listHtml;
    document.querySelector('.modal-header h2').textContent = '교과목 수정';
    showModal();
}

// 전체 화면 토글
function toggleFullscreen() {
    const matrixContent = document.getElementById('matrix');
    const fullscreenText = document.getElementById('fullscreen-text');
    
    if (matrixContent.classList.contains('fullscreen-active')) {
        matrixContent.classList.remove('fullscreen-active');
        fullscreenText.textContent = '전체 화면';
    } else {
        matrixContent.classList.add('fullscreen-active');
        fullscreenText.textContent = '화면 축소';
    }
}

// Excel 내보내기 (실제 엑셀 파일로 내보내기, 표 구조 보존)
function exportToExcel() {
    const table = document.getElementById('matrixTable');
    if (!table) return;
    
    // SheetJS 라이브러리 확인
    if (typeof XLSX === 'undefined') {
        alert('엑셀 내보내기 기능을 사용하려면 SheetJS 라이브러리가 필요합니다.');
        return;
    }
    
    // 워크북 생성
    const wb = XLSX.utils.book_new();
    
    // 데이터 배열 생성
    const data = [];
    
    // 테이블 제목 추가
    const matrixTitle = document.getElementById('matrixTitle');
    if (matrixTitle && matrixTitle.textContent.trim()) {
        data.push([matrixTitle.textContent.trim()]);
        data.push([]); // 빈 행 추가
    }
    
    const rows = table.querySelectorAll('tr');
    
    rows.forEach((row, rowIndex) => {
        const cells = row.querySelectorAll('th, td');
        const rowData = [];
        
        cells.forEach((cell, cellIndex) => {
            let text = cell.textContent || cell.innerText || '';
            
            // 셀 병합 정보 확인
            const colspan = cell.getAttribute('colspan');
            const rowspan = cell.getAttribute('rowspan');
            
            // 빈 셀 처리 (병합된 셀의 경우)
            if (text.trim() === '' && (colspan || rowspan)) {
                text = '';
            }
            
            // 줄바꿈 유지 (엑셀에서는 \n을 줄바꿈으로 인식)
            text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n'); // 줄바꿈 통일
            text = text.replace(/[ \t]+/g, ' ').trim(); // 연속 공백 제거 (줄바꿈 제외)
            
            rowData.push(text);
        });
        
        // 빈 행이 아닌 경우에만 추가
        if (rowData.some(cell => cell !== '')) {
            data.push(rowData);
        }
    });
    
    // 워크시트 생성
    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // 셀 병합 정보 처리
    const merges = [];
    let mergeRowIndex = 0;
    
    rows.forEach((row, rowIndex) => {
        const cells = row.querySelectorAll('th, td');
        let mergeColIndex = 0;
        
        cells.forEach((cell, cellIndex) => {
            const colspan = parseInt(cell.getAttribute('colspan')) || 1;
            const rowspan = parseInt(cell.getAttribute('rowspan')) || 1;
            
            if (colspan > 1 || rowspan > 1) {
                merges.push({
                    s: { r: mergeRowIndex, c: mergeColIndex },
                    e: { r: mergeRowIndex + rowspan - 1, c: mergeColIndex + colspan - 1 }
                });
            }
            
            mergeColIndex += colspan;
        });
        
        mergeRowIndex++;
    });
    
    if (merges.length > 0) {
        ws['!merges'] = merges;
    }
    
    // 열 너비 자동 조정
    const colWidths = [];
    data.forEach(row => {
        row.forEach((cell, colIndex) => {
            if (!colWidths[colIndex]) colWidths[colIndex] = 0;
            const cellLength = String(cell).length;
            colWidths[colIndex] = Math.max(colWidths[colIndex], cellLength);
        });
    });
    
    ws['!cols'] = colWidths.map(width => ({ width: Math.min(Math.max(width + 2, 8), 50) }));
    
    // 워크북에 워크시트 추가
    XLSX.utils.book_append_sheet(wb, ws, '수행평가매트릭스');
    
    // 파일명에 현재 날짜 추가
    const now = new Date();
    const dateStr = now.getFullYear() + 
                   String(now.getMonth() + 1).padStart(2, '0') + 
                   String(now.getDate()).padStart(2, '0');
    const filename = `수행평가매트릭스_${dateStr}.xlsx`;
    
    // 파일 다운로드
    XLSX.writeFile(wb, filename);
}

// 폰트 사이즈 조정 기능
let currentFontSize = 14;

function increaseFontSize() {
    if (currentFontSize < 20) {
        currentFontSize += 1;
        updateFontSize();
    }
}

function decreaseFontSize() {
    if (currentFontSize > 10) {
        currentFontSize -= 1;
        updateFontSize();
    }
}

function updateFontSize() {
    const matrixTable = document.getElementById('matrixTable');
    const extraTable = document.querySelector('.matrix-extra-table');
    const fontDisplay = document.getElementById('font-size-display');
    
    if (matrixTable) {
        matrixTable.style.fontSize = currentFontSize + 'px';
        // 헤더와 셀의 폰트 사이즈도 업데이트
        const headers = matrixTable.querySelectorAll('th');
        const cells = matrixTable.querySelectorAll('td');
        headers.forEach(header => {
            header.style.fontSize = currentFontSize + 'px';
        });
        cells.forEach(cell => {
            cell.style.fontSize = currentFontSize + 'px';
        });
    }
    // extra matrix table에도 동일하게 적용
    if (extraTable) {
        extraTable.style.fontSize = currentFontSize + 'px';
        const headers = extraTable.querySelectorAll('th');
        const cells = extraTable.querySelectorAll('td');
        headers.forEach(header => {
            header.style.fontSize = currentFontSize + 'px';
        });
        cells.forEach(cell => {
            cell.style.fontSize = currentFontSize + 'px';
        });
    }
    if (fontDisplay) {
        fontDisplay.textContent = currentFontSize + 'px';
    }
}

// PDF 내보내기 (벡터 기반, 페이지 모습 보존)
function exportToPDF() {
    const table = document.getElementById('matrixTable');
    if (!table) return;
    
    // jsPDF 라이브러리 확인
    if (typeof window.jsPDF === 'undefined') {
        alert('PDF 내보내기 기능을 사용하려면 jsPDF 라이브러리가 필요합니다.');
        return;
    }
    
    // jsPDF 인스턴스 생성 (가로 방향)
    const { jsPDF } = window.jsPDF;
    const doc = new jsPDF('landscape', 'mm', 'a4');
    
    // 페이지 크기 설정
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);
    const contentHeight = pageHeight - (margin * 2);
    
    // 제목 추가
    const matrixTitle = document.getElementById('matrixTitle');
    const titleText = matrixTitle ? matrixTitle.textContent.trim() : '학생수행평가기준과 교과목 매트릭스 2025';
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(titleText, pageWidth / 2, margin + 10, { align: 'center' });
    
    // 테이블 데이터 추출
    const tableData = [];
    const rows = table.querySelectorAll('tr');
    
    rows.forEach(row => {
        const rowData = [];
        const cells = row.querySelectorAll('th, td');
        
        cells.forEach(cell => {
            let text = cell.textContent || cell.innerText || '';
            // 줄바꿈 처리
            text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
            rowData.push(text);
        });
        
        if (rowData.some(cell => cell !== '')) {
            tableData.push(rowData);
        }
    });
    
    // 테이블 스타일 설정
    const tableConfig = {
        startY: margin + 20,
        styles: {
            fontSize: 8,
            cellPadding: 2,
            lineColor: [0, 0, 0],
            lineWidth: 0.1,
            textColor: [0, 0, 0]
        },
        headStyles: {
            fillColor: [44, 62, 80],
            textColor: [255, 255, 255],
            fontSize: 9,
            fontStyle: 'bold'
        },
        alternateRowStyles: {
            fillColor: [245, 245, 245]
        },
        columnStyles: {
            0: { cellWidth: 25 }, // 과목명
            1: { cellWidth: 15 }, // 학년
            2: { cellWidth: 15 }, // 학기
            3: { cellWidth: 15 }, // 구분
            4: { cellWidth: 15 }, // 과목분류
            5: { cellWidth: 15 }, // 학점
            6: { cellWidth: 15 }, // 담당교수
            7: { cellWidth: 15 }, // 수행평가기준
        },
        didDrawCell: function(data) {
            // 셀 내용이 긴 경우 줄바꿈 처리
            if (data.cell.text && data.cell.text.length > 20) {
                const lines = doc.splitTextToSize(data.cell.text, data.cell.width - 4);
                if (lines.length > 1) {
                    data.cell.text = lines;
                }
            }
        }
    };
    
    // 테이블 그리기
    doc.autoTable({
        ...tableConfig,
        body: tableData.slice(1), // 헤더 제외
        head: [tableData[0]] // 첫 번째 행을 헤더로
    });
    
    // 파일명에 현재 날짜 추가
    const now = new Date();
    const dateStr = now.getFullYear() + 
                   String(now.getMonth() + 1).padStart(2, '0') + 
                   String(now.getDate()).padStart(2, '0');
    const filename = `수행평가매트릭스_${dateStr}.pdf`;
    
    // PDF 저장
    doc.save(filename);
}



// 이수모형 제목 편집 가능 여부 설정
function setCurriculumTitleEditable(editable) {
    const titleElement = document.getElementById('curriculumTitle');
    if (!titleElement) return;
        
        if (editable) {
        // 편집 모드로 설정
        titleElement.contentEditable = true;
        titleElement.style.border = '2px solid #007bff';
        titleElement.style.padding = '8px';
        titleElement.style.borderRadius = '4px';
        titleElement.style.backgroundColor = '#f8f9fa';
        titleElement.style.cursor = 'text';
        titleElement.focus();
        
        // 원본 제목 저장
        if (!titleElement.getAttribute('data-original-title')) {
            titleElement.setAttribute('data-original-title', titleElement.textContent);
        }
        
        // 편집 완료 이벤트 리스너 추가
        titleElement.addEventListener('blur', handleCurriculumTitleInput);
        titleElement.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                titleElement.blur();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                titleElement.textContent = titleElement.getAttribute('data-original-title');
                titleElement.blur();
            }
        });
        
        } else {
        // 일반 모드로 설정
        titleElement.contentEditable = false;
        titleElement.style.border = '';
        titleElement.style.padding = '';
        titleElement.style.borderRadius = '';
        titleElement.style.backgroundColor = '';
        titleElement.style.cursor = '';
        
        // 이벤트 리스너 제거
        titleElement.removeEventListener('blur', handleCurriculumTitleInput);
        
    }
}

// 이수모형 제목 입력 처리
function handleCurriculumTitleInput() {
    const titleElement = document.getElementById('curriculumTitle');
    if (!titleElement) return;
    
    const newTitle = titleElement.textContent.trim();
    const originalTitle = titleElement.getAttribute('data-original-title') || '';
    
    if (newTitle !== originalTitle) {
        // 제목 변경사항을 임시 저장소에 저장
        if (!tempCurriculumCellTexts._titleChanged) {
            tempCurriculumCellTexts._titleChanged = true;
            tempCurriculumCellTexts._oldTitle = originalTitle;
            tempCurriculumCellTexts._newTitle = newTitle;
        } else {
            tempCurriculumCellTexts._newTitle = newTitle;
        }
        
        // localStorage에 즉시 저장
        localStorage.setItem('curriculumTitleText', newTitle);
        
        showToast('제목이 임시 저장되었습니다. 버전 저장 버튼을 눌러주세요.');
    }
    
    // 편집 모드 비활성화
    setCurriculumTitleEditable(false);
}

// 이수모형 셀 편집 활성화
function enableCurriculumCellEditing() {
    const curriculumTable = document.querySelector('.curriculum-table');
    if (!curriculumTable) return;
    
    const cells = curriculumTable.querySelectorAll('td');
    cells.forEach(cell => {
        // 교과목 블록이 있는 셀은 편집 불가
        if (cell.querySelector('.course-block')) {
            return;
        }
        
        cell.classList.add('editable-cell');
        cell.addEventListener('click', handleCurriculumCellClick);
    });
}

// 이수모형 셀 편집 비활성화
function disableCurriculumCellEditing() {
    const curriculumTable = document.querySelector('.curriculum-table');
    if (!curriculumTable) return;
    
    const cells = curriculumTable.querySelectorAll('td');
    cells.forEach(cell => {
        cell.classList.remove('editable-cell');
        cell.removeEventListener('click', handleCurriculumCellClick);
        
        // 편집 중인 셀이 있다면 편집 취소
        if (cell.querySelector('input')) {
            cancelCurriculumCellEdit(cell);
        }
    });
}

// 이수모형 셀 클릭 처리
function handleCurriculumCellClick(event) {
    const cell = event.target;
    if (cell.classList.contains('editable-cell') && !cell.querySelector('input')) {
        startCurriculumCellEdit(cell);
    }
}

// 이수모형 셀 편집 시작
function startCurriculumCellEdit(cell) {
    const originalContent = cell.textContent;
    cell.setAttribute('data-original-content', originalContent);
    cell.classList.add('editing-cell');
    
    // textarea 생성 (셀 전체 영역 사용)
    const textarea = document.createElement('textarea');
    textarea.value = originalContent;
    textarea.className = 'cell-edit-textarea';
    textarea.style.width = '100%';
    textarea.style.height = '100%';
    textarea.style.minHeight = '100%';
    textarea.style.maxHeight = '300px';
    textarea.style.boxSizing = 'border-box';
    textarea.style.overflow = 'auto';
    textarea.style.padding = '4px';
    textarea.style.margin = '0';
    textarea.style.borderRadius = '4px';
    textarea.style.border = '1.5px solid #bdbdbd';
    textarea.style.background = '#bdbdbd';
    textarea.style.fontSize = 'inherit';
    textarea.style.fontFamily = 'inherit';
    textarea.style.resize = 'none';
    textarea.style.outline = 'none';
    textarea.style.position = 'absolute';
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.right = '0';
    textarea.style.bottom = '0';
    
    // autosize
    function autosize(el) {
        el.style.height = 'auto';
        el.style.height = (el.scrollHeight) + 'px';
    }
    textarea.addEventListener('input', function() { autosize(textarea); });
    setTimeout(function() { autosize(textarea); }, 0);
    
    // 이벤트
    textarea.addEventListener('blur', () => saveCurriculumCellEdit(cell, textarea.value, originalContent));
    textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            cancelCurriculumCellEdit(cell, originalContent);
        }
        // Enter는 줄바꿈만, 저장은 blur로
    });
    
    cell.innerHTML = '';
    cell.appendChild(textarea);
    textarea.focus();
    textarea.select();
}

function saveCurriculumCellEdit(cell, newValue, originalContent) {
    if (newValue !== originalContent) {
        // 줄바꿈 <br>로 변환
        cell.innerHTML = newValue.replace(/\r\n|\r|\n/g, '<br>');
        
        // 임시 저장소에 저장
        tempCurriculumCellTexts[cell.id] = newValue.replace(/\r\n|\r|\n/g, '\n');
        
        // 실제 데이터에도 반영 (임시 데이터는 버전 저장 시 사용)
        curriculumCellTexts[cell.id] = newValue.replace(/\r\n|\r|\n/g, '\n');
        
        showToast('변경사항이 임시 저장되었습니다. 버전 저장 버튼을 눌러주세요.');
    } else {
        cell.innerHTML = originalContent;
    }
    cell.classList.remove('editing-cell');
    cell.removeAttribute('data-original-content');
}

// 이수모형 셀 편집 취소
function cancelCurriculumCellEdit(cell, originalContent) {
    cell.textContent = originalContent;
}

// 이수모형 버전 라벨 업데이트
function updateCurriculumVersionLabel() {
    const label = document.getElementById('curriculumVersionLabel');
    if (label) {
        label.textContent = `[이수모형 개정: ${currentVersion}]`;
    }
}

// 수행평가 기준 텍스트 생성
function getPerformanceCriteria(matrixValues) {
    const criteriaNames = [
        '건축과 예술 및 과학기술', '세계 건축의 역사와 문화', '한국 건축과 전통', '건축과 사회',
        '형태 및 공간구성', '대지와 외부공간 계획', '안전 설계', '건축재료와 구성방법',
        '건물시스템 통합설계', '건축과 도시설계', '연구기반 종합설계', '구조원리',
        '구조시스템', '환경조절 시스템', '건축설비 시스템', '시공 및 건설관리',
        '프로젝트수행과 건축사무소운영', '건축사법과 건축법 및 관계법령'
    ];
    
    const activeCriteria = [];
    matrixValues.forEach((value, index) => {
        if (value > 0) {
            const criteriaName = criteriaNames[index];
            // plain text로만 추가
            activeCriteria.push(`${index + 1}.${criteriaName}`);
        }
    });
    
    const shortText = activeCriteria.length > 0 ? `${activeCriteria.length}개 기준` : '없음';
    // fullText, detailedText는 plain text로 반환
    const fullText = activeCriteria.length > 0 ? activeCriteria.join(', ') : '할당된 수행평가 기준이 없습니다.';
    const detailedText = activeCriteria.length > 0 ? activeCriteria.join(', ') : '없음';
    
    return { shortText, fullText, detailedText };
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    init();
    
    // 폼 제출 이벤트 리스너 추가
    document.getElementById('courseForm').addEventListener('submit', handleCourseSubmit);
    
    // 키보드 이벤트 리스너 추가
    document.addEventListener('keydown', handleMatrixKeyboardEdit);
    
    // 색상 범례 초기화 (페이지 로드 시)
    setTimeout(() => {
        updateColorLegendCurriculum();
        updateColorLegendCommonValues();
    }, 100);
});

// 정렬 기능 처리
function handleSort(column) {
    const table = document.getElementById('coursesTable');
    const headers = table.querySelectorAll('th.sortable');
    
    // 기존 정렬 상태 제거
    headers.forEach(header => {
        header.classList.remove('asc', 'desc');
    });
    
    // 같은 컬럼을 클릭한 경우 방향 전환
    if (currentSortColumn === column) {
        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortColumn = column;
        currentSortDirection = 'asc';
    }
    
    // 데이터 정렬
    sortCourses(column, currentSortDirection);
    
    // 현재 정렬 상태 표시
    const currentHeader = table.querySelector(`th[data-sort="${column}"]`);
    if (currentHeader) {
        currentHeader.classList.add(currentSortDirection);
    }
    
    // 테이블 내용만 업데이트 (전체 렌더링 대신)
    updateTableContent();
}

// 테이블 내용만 업데이트 (성능 최적화)
function updateTableContent() {
    const tbody = document.getElementById('coursesTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    const list = filteredCourses || courses;
    
    list.forEach((course, idx) => {
        // 원본 배열에서의 인덱스 찾기
        const originalIndex = courses.findIndex(c => c === course);
        
        // 매트릭스 데이터 가져오기
        const matrixValues = matrixData[course.courseName] || new Array(18).fill(0);
        const performanceCriteria = getPerformanceCriteria(matrixValues);
        
        const row = tbody.insertRow();
        row.innerHTML = `
            <td class="no-edit">${course.yearSemester}</td>
            <td class="no-edit">${course.courseNumber}</td>
            <td><strong ondblclick="editCourse(${originalIndex})">${course.courseName}</strong></td>
            <td>${course.professor || '-'}</td>
            <td class="no-edit">${course.credits}</td>
            <td class="no-edit">
                <span class="category-badge badge-${getCategoryClass(course.category)}">${course.category}</span>
            </td>
            <td class="no-edit">
                <span class="subject-type-badge badge-${getSubjectTypeClass(course.subjectType)}">${course.subjectType}</span>
            </td>
            <td class="no-edit">${course.isRequired}</td>
            <td class="performance-criteria no-edit" title="${performanceCriteria.fullText}">${performanceCriteria.detailedText}</td>
            <td class="no-edit">
                <button class="btn btn-sm" onclick="editCourse(${originalIndex})" style="font-size: 12px; padding: 5px 10px;">수정</button>
                <button class="btn btn-sm btn-secondary" onclick="deleteCourse(${originalIndex})" style="font-size: 12px; padding: 5px 10px;">삭제</button>
            </td>
        `;
    });
}

// 교과목 데이터 정렬
function sortCourses(column, direction) {
    const coursesToSort = filteredCourses || courses;
    
    // 정렬 전에 데이터 복사 (원본 배열 보호)
    const sortedCourses = [...coursesToSort];
    
    sortedCourses.sort((a, b) => {
        let aValue, bValue;
        
        switch (column) {
            case 'yearSemester':
                aValue = a.yearSemester;
                bValue = b.yearSemester;
                break;
            case 'courseNumber':
                aValue = a.courseNumber;
                bValue = b.courseNumber;
                break;
            case 'courseName':
                aValue = a.courseName;
                bValue = b.courseName;
                break;
            case 'professor':
                aValue = a.professor || '';
                bValue = b.professor || '';
                break;
            case 'credits':
                aValue = parseInt(a.credits);
                bValue = parseInt(b.credits);
                break;
            case 'category':
                aValue = a.category;
                bValue = b.category;
                break;
            case 'subjectType':
                aValue = a.subjectType;
                bValue = b.subjectType;
                break;
            case 'isRequired':
                aValue = a.isRequired;
                bValue = b.isRequired;
                break;
            case 'performanceCriteria':
                // 수행평가기준은 매트릭스 데이터 기반으로 정렬
                const aMatrix = matrixData[a.courseName] || new Array(18).fill(0);
                const bMatrix = matrixData[b.courseName] || new Array(18).fill(0);
                const aCount = aMatrix.filter(v => v > 0).length;
                const bCount = bMatrix.filter(v => v > 0).length;
                aValue = aCount;
                bValue = bCount;
                break;
            default:
                return 0;
        }
        
        // 문자열 비교
        if (typeof aValue === 'string' && typeof bValue === 'string') {
            aValue = aValue.toLowerCase();
            bValue = bValue.toLowerCase();
        }
        
        if (aValue < bValue) {
            return direction === 'asc' ? -1 : 1;
        } else if (aValue > bValue) {
            return direction === 'asc' ? 1 : -1;
        }
        return 0;
    });
    
    // 정렬된 결과를 filteredCourses에 저장
    if (filteredCourses) {
        filteredCourses.length = 0;
        filteredCourses.push(...sortedCourses);
    } else {
        // 전체 데이터를 정렬할 때는 임시로 filteredCourses 사용
        filteredCourses = sortedCourses;
    }
}

// 정렬 이벤트 리스너 초기화
function initSortListeners() {
    const table = document.getElementById('coursesTable');
    if (!table) return;
    
    const sortableHeaders = table.querySelectorAll('th.sortable');
    sortableHeaders.forEach(header => {
        header.addEventListener('click', function(e) {
            // 리사이즈 핸들러 클릭 시 정렬 방지
            if (e.target.classList.contains('column-resizer')) {
                return;
            }
            
            const column = this.getAttribute('data-sort');
            if (column) {
                handleSort(column);
            }
        });
    });
}

// 매트릭스 필터링
function filterMatrix() {
    // 선택된 학년들 가져오기
    const selectedYears = [];
    document.querySelectorAll('.matrix-filters input[type="checkbox"][value^="1"], .matrix-filters input[type="checkbox"][value^="2"], .matrix-filters input[type="checkbox"][value^="3"], .matrix-filters input[type="checkbox"][value^="4"], .matrix-filters input[type="checkbox"][value^="5"]').forEach(checkbox => {
        if (checkbox.checked) {
            selectedYears.push(checkbox.value);
        }
    });
    
    // 선택된 필수여부들 가져오기
    const selectedRequired = [];
    document.querySelectorAll('.matrix-filters input[type="checkbox"][value="필수"], .matrix-filters input[type="checkbox"][value="선택"]').forEach(checkbox => {
        if (checkbox.checked) {
            selectedRequired.push(checkbox.value);
        }
    });
    
    filteredMatrixCourses = courses.filter(course => {
        const [year] = course.yearSemester.split('-');
        
        // 학년 필터링: 선택된 학년이 없으면 모든 학년 표시, 있으면 선택된 학년만
        const yearMatch = selectedYears.length === 0 || selectedYears.includes(year);
        
        // 필수여부 필터링: 선택된 필수여부가 없으면 모든 과목 표시, 있으면 선택된 것만
        const requiredMatch = selectedRequired.length === 0 || selectedRequired.includes(course.isRequired);
        
        return yearMatch && requiredMatch;
    });
    
    renderMatrix();
}

// 매트릭스 필터 초기화
function resetMatrixFilters() {
    // 모든 체크박스 해제
    document.querySelectorAll('.matrix-filters input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
    });
    
    filteredMatrixCourses = null;
    renderMatrix();
}

// =========================
// 매트릭스 버전 관리 기능
// =========================

let currentMatrixVersion = '기본';



// 토스트 메시지 함수
function showToast(msg) {
    let toast = document.getElementById('globalToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'globalToast';
        toast.style.position = 'fixed';
        toast.style.top = '50%';
        toast.style.left = '50%';
        toast.style.transform = 'translate(-50%, -50%)';
        toast.style.background = 'rgba(40,40,40,0.95)';
        toast.style.color = '#fff';
        toast.style.padding = '18px 36px';
        toast.style.borderRadius = '10px';
        toast.style.fontSize = '16px';
        toast.style.zIndex = 9999;
        toast.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
        toast.style.display = 'none';
        toast.style.maxWidth = '600px';
        toast.style.whiteSpace = 'pre-line';
        toast.style.textAlign = 'left';
        toast.style.lineHeight = '1.4';
        document.body.appendChild(toast);
    }
    
    // 긴 메시지의 경우 줄바꿈을 유지
    toast.innerHTML = msg;
    toast.style.display = 'block';
    
    // 메시지 길이에 따라 표시 시간 조정
    const displayTime = msg.length > 100 ? 5000 : 3000;
    
    setTimeout(() => { 
        toast.style.display = 'none'; 
    }, displayTime);
}

// 매트릭스 제목 인라인 편집 (수정모드에서만)
function setMatrixTitleEditable(editable) {
    const title = document.getElementById('matrixTitle');
    if (!title) return;
    
    if (editable) {
        // 편집 시작 시 원본 제목 저장
        if (!title.getAttribute('data-original-title')) {
            title.setAttribute('data-original-title', title.textContent);
        }
        
        // 편집 모드 시작 시 tempMatrixData 상태 확인 및 초기화
        if (Object.keys(tempMatrixData).length === 0) {
            // tempMatrixData가 비어있으면 현재 matrixData를 복사
            tempMatrixData = { ...matrixData };
        }
        
        title.contentEditable = true;
        title.style.outline = '2px dashed #4a90e2';
        title.style.cursor = 'text';
        title.style.backgroundColor = '#fffbe7';
        title.style.padding = '4px 8px';
        title.style.borderRadius = '4px';
        title.style.border = '1px solid #bdbdbd';
        
        // 편집 시작 시 포커스
        title.focus();
        
        // 편집 완료 이벤트 추가
        title.addEventListener('blur', handleMatrixTitleInput);
        title.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                title.blur();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                title.textContent = localStorage.getItem('matrixTitleText') || '수행평가 매트릭스';
                title.blur();
            }
        });
    } else {
        title.contentEditable = false;
        title.style.outline = 'none';
        title.style.cursor = 'default';
        title.style.backgroundColor = 'transparent';
        title.style.padding = '';
        title.style.borderRadius = '';
        title.style.border = '';
        
        // 이벤트 리스너 제거
        title.removeEventListener('blur', handleMatrixTitleInput);
    }
}

// 제목 변경 시 저장
function handleMatrixTitleInput() {
    const title = document.getElementById('matrixTitle');
    if (!title) return;
    
    const newTitle = title.textContent.trim();
    const oldTitle = localStorage.getItem('matrixTitleText') || '수행평가 매트릭스';
    
    if (newTitle !== oldTitle) {
        // localStorage에 저장
        localStorage.setItem('matrixTitleText', newTitle);
        
        // 임시 저장소에 변경사항 기록
        if (!tempMatrixData._titleChanged) {
            tempMatrixData._titleChanged = true;
            tempMatrixData._oldTitle = oldTitle;
            tempMatrixData._newTitle = newTitle;
        }
        
        // 현재 matrixData도 tempMatrixData에 복사 (제목 변경 정보가 있으면 항상 matrixData를 복사)
        if (tempMatrixData._titleChanged) {
            // 기존 matrixData를 tempMatrixData에 복사 (제목 관련 속성은 유지)
            const currentMatrixData = { ...matrixData };
            tempMatrixData = { ...currentMatrixData, ...tempMatrixData };
        }
        
        showToast('매트릭스 제목이 임시 저장되었습니다. 버전 저장 버튼을 눌러주세요.');
    }
}

// ... existing code ...


// ... existing code ...

// ... existing code ...
function updateAnalysisStats() {
    // 삭제된 교과목과 고스트 블록을 제외한 활성 교과목만 필터링
    const activeCourses = courses.filter(course => {
        const isDeleted = course.isDeleted === true;
        const isGhost = course.isGhost === true;
        return !isDeleted && !isGhost;
    });
    
    // 총학점
    const totalCredits = activeCourses.reduce((sum, c) => sum + (parseInt(c.credits) || 0), 0);
    // 전공필수과목
    const requiredCourses = activeCourses.filter(c => c.isRequired === '필수' && c.category !== '교양').length;
    // 전공선택과목
    const electiveCourses = activeCourses.filter(c => c.isRequired === '선택' && c.category !== '교양').length;
    // 설계과목
    const designCourses = activeCourses.filter(c => c.category === '설계').length;
    // 설계과목 비율
    const designRatio = activeCourses.length > 0 ? ((designCourses / activeCourses.length) * 100).toFixed(1) + '%' : '0%';
    
    // 학년별 교과목 분포 계산
    const yearDistribution = {};
    activeCourses.forEach(course => {
        const [year, semester] = course.yearSemester.split('-');
        const key = `${year}-${semester}`;
        if (!yearDistribution[key]) {
            yearDistribution[key] = { count: 0, credits: 0 };
        }
        yearDistribution[key].count++;
        yearDistribution[key].credits += parseInt(course.credits) || 0;
    });
    
    // 학년별 합계 계산
    const yearTotals = {};
    for (let year = 1; year <= 5; year++) {
        yearTotals[year] = { count: 0, credits: 0 };
        for (let semester = 1; semester <= 2; semester++) {
            const key = `${year}-${semester}`;
            if (yearDistribution[key]) {
                yearTotals[year].count += yearDistribution[key].count;
                yearTotals[year].credits += yearDistribution[key].credits;
            }
        }
        // 계절학기 추가
        const summerKey = `${year}-계절`;
        if (yearDistribution[summerKey]) {
            yearTotals[year].count += yearDistribution[summerKey].count;
            yearTotals[year].credits += yearDistribution[summerKey].credits;
        }
    }
    
    // DOM에 반영
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('totalCredits', totalCredits);
    set('requiredCourses', requiredCourses);
    set('electiveCourses', electiveCourses);
    set('designCourses', designCourses);
    set('designRatio', designRatio);
    
    // 학년별 교과목 분포 표 업데이트
    const updateYearDistributionTable = () => {
        const tbody = document.querySelector('#analysis .table-container table tbody');
        if (!tbody) return;
        
        const rows = tbody.querySelectorAll('tr');
        rows.forEach((row, index) => {
            const year = index + 1;
            const cells = row.querySelectorAll('td');
            
            // 1학기
            const semester1Key = `${year}-1`;
            const semester1Data = yearDistribution[semester1Key] || { count: 0, credits: 0 };
            cells[1].textContent = semester1Data.count > 0 ? `${semester1Data.count}과목 (${semester1Data.credits}학점)` : '-';
            
            // 2학기
            const semester2Key = `${year}-2`;
            const semester2Data = yearDistribution[semester2Key] || { count: 0, credits: 0 };
            cells[2].textContent = semester2Data.count > 0 ? `${semester2Data.count}과목 (${semester2Data.credits}학점)` : '-';
            
            // 계절학기
            const summerKey = `${year}-계절`;
            const summerData = yearDistribution[summerKey] || { count: 0, credits: 0 };
            cells[3].textContent = summerData.count > 0 ? `${summerData.count}과목 (${summerData.credits}학점)` : '-';
            
            // 합계
            const totalData = yearTotals[year];
            cells[4].textContent = totalData.count > 0 ? `${totalData.count}과목 (${totalData.credits}학점)` : '-';
        });
    };
    
    updateYearDistributionTable();
    
    // 차트들 업데이트
    drawChart();
    drawSubjectTypeChart();
}
// 주요 렌더링 후 updateAnalysisStats 호출
const origRenderCourses = renderCourses;
renderCourses = function() { origRenderCourses.apply(this, arguments); updateAnalysisStats(); };
const origRenderMatrix = renderMatrix;
renderMatrix = function() { origRenderMatrix.apply(this, arguments); updateAnalysisStats(); };
// 페이지 최초 로딩 시에도 호출
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateAnalysisStats);
} else {
    updateAnalysisStats();
}
// ... existing code ...

// 이수모형표에 교과목 배치 (삭제 diff 교과목도 별도로 배치)
function renderCurriculumTable() {
    // 이수모형 제목 업데이트
    const titleElement = document.getElementById('curriculumTitle');
    if (titleElement) {
        const savedTitle = localStorage.getItem('curriculumTitleText');
        if (savedTitle) {
            titleElement.textContent = savedTitle;
        } else {
            titleElement.textContent = '건축학전공 교과과정 이수모형';
        }
    }
    
    // 화살표 초기화
    clearMoveArrows();
    
    // 기존 블록들과 화살표 제거
    const cells = document.querySelectorAll('[id^="cell-"]');
    cells.forEach(cell => {
        cell.innerHTML = '';
    });
    
    // 기존 화살표 제거 (레거시)
    const existingArrows = document.querySelectorAll('.move-arrow');
    existingArrows.forEach(arrow => arrow.remove());
    
    const diffSummary = getCurrentDiffSummary();
    const movedCoursesForGhost = []; // 이동된 교과목 저장용
    
    // 현재 교과목들 배치
    courses.forEach(course => {
        const cellId = getCurriculumCellId(course);
        const cell = document.getElementById(cellId);
        if (cell) {
            const block = createCourseBlock(course, false, false); // 일반 교과목
            // 여러 블럭이 들어가는 셀은 block-wrap으로 감싸서 추가
            // (셀에 이미 block-wrap이 있으면 그 안에 추가, 없으면 새로 생성)
            let blockWrap = cell.querySelector('.block-wrap');
            if (!blockWrap) {
                blockWrap = document.createElement('div');
                blockWrap.className = 'block-wrap';
                cell.appendChild(blockWrap);
            }
            blockWrap.appendChild(block);
            
            // 학년학기가 변경된 교과목인지 확인
            const courseChange = diffSummary.find(entry => 
                entry.course && entry.course.id === course.id && entry.type === '수정'
            );
            
            if (courseChange) {
                const yearSemesterChange = courseChange.changes.find(c => c.field === 'yearSemester');
                const isRequiredChange = courseChange.changes.find(c => c.field === 'isRequired');
                const categoryChange = courseChange.changes.find(c => c.field === 'category');
                
                // 학년학기 변경, 필수여부 변경, 또는 분야 변경이 있는 경우
                if (yearSemesterChange || isRequiredChange || categoryChange) {
                    const oldCourse = { ...course };
                    courseChange.changes.forEach(change => {
                        oldCourse[change.field] = change.before;
                    });
                    
                    // 학년학기 변경이 있는 경우 해당 값도 복원
                    if (yearSemesterChange) {
                        oldCourse.yearSemester = yearSemesterChange.before;
                    }
                    
                    movedCoursesForGhost.push({
                        initialCourse: oldCourse,
                        currentCourse: course
                    });
                }
            }
        }
    });
    
    


    // 삭제된 교과목들 배치
    const deletedCourses = diffSummary.filter(entry => entry.type === '삭제');
    deletedCourses.forEach(entry => {
        const course = entry.course;
        const cellId = getCurriculumCellId(course);
        const cell = document.getElementById(cellId);
        if (cell) {
            let blockWrap = cell.querySelector('.block-wrap');
            if (!blockWrap) {
                blockWrap = document.createElement('div');
                blockWrap.className = 'block-wrap';
                cell.appendChild(blockWrap);
            }
            const block = createCourseBlock(course, true, false); // 삭제된 교과목
            blockWrap.appendChild(block);
        }
    });
    
    // 고스트 블럭 생성
    movedCoursesForGhost.forEach((moveInfo, index) => {
        const initialCellId = getCurriculumCellId(moveInfo.initialCourse);
        const initialCell = document.getElementById(initialCellId);
        if (initialCell) {
            let blockWrap = initialCell.querySelector('.block-wrap');
            if (!blockWrap) {
                blockWrap = document.createElement('div');
                blockWrap.className = 'block-wrap';
                initialCell.appendChild(blockWrap);
            }
            const ghostBlock = createCourseBlock(moveInfo.initialCourse, false, true);
            blockWrap.appendChild(ghostBlock);
        }
    });
    
    // 학점 합계 계산 및 표시
    calculateAndDisplayCredits();
    
    // 모든 교과목 블록의 드래그 가능 여부 업데이트
    updateAllCourseBlocksDraggable();
    
    // block-wrap 드래그 이벤트 연결
    setupBlockWrapDragEvents();
    
    // 화살표 그리기 (DOM 렌더링이 확실히 끝난 뒤 실행)
    setTimeout(() => {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                drawMoveArrows(movedCoursesForGhost);
            });
        });
    }, 0);
    
    // 교과목 블록 배치 후 셀 텍스트 복원 (교과목 블록이 없는 셀들만)
    let restoredCellCount = 0;
    cells.forEach(cell => {
        if (curriculumCellTexts[cell.id]) {
            const savedContent = curriculumCellTexts[cell.id];
            if (savedContent && savedContent.trim() !== '') {
                // 교과목 블록이 없는 셀만 텍스트 복원
                const courseBlocks = cell.querySelectorAll('.course-block');
                if (courseBlocks.length === 0) {
                    // 줄바꿈을 <br>로 변환하여 표시
                    cell.innerHTML = savedContent.replace(/\n/g, '<br>');
                    restoredCellCount++;
                } else {
                    // 교과목 블록이 있는 셀의 경우, 블록 뒤에 텍스트 추가
                    const textContent = savedContent.replace(/\n/g, '<br>');
                    if (textContent.trim() !== '') {
                        cell.innerHTML += textContent;
                        restoredCellCount++;
                    }
                }
            }
        }
    });
    
    // 수정모드가 활성화되어 있다면 셀 편집 기능 다시 설정
    const editModeButton = document.getElementById('editModeToggleCurriculum');
    if (editModeButton && editModeButton.classList.contains('active')) {
        enableCurriculumCellEditing();
    }
    
    // 생성된 모든 교과목 블록에 현재 설정된 글씨 크기 적용
    setTimeout(() => {
        const allCourseBlocks = document.querySelectorAll('.course-block');
        allCourseBlocks.forEach(block => {
            block.style.fontSize = currentCurriculumFontSize + 'px';
            
            const title = block.querySelector('.course-block-title');
            const info = block.querySelector('.course-block-info');
            
            if (title) {
                title.style.fontSize = currentCurriculumFontSize + 'px';
            }
            if (info) {
                info.style.fontSize = (currentCurriculumFontSize - 2) + 'px';
            }
        });
    }, 50);
}

// 학점 합계 계산 및 표시
function calculateAndDisplayCredits() {
    // 삭제된 교과목과 고스트 블록을 제외한 활성 교과목만 필터링
    const activeCourses = courses.filter(course => {
        const isDeleted = course.isDeleted === true;
        const isGhost = course.isGhost === true;
        return !isDeleted && !isGhost;
    });
    
    // 학년-학기별 전체 학점 합계 계산
    const creditSums = {};
    
    activeCourses.forEach(course => {
        let [year, semester] = course.yearSemester.split('-');
        if (semester === '계절') semester = '2'; // 계절학기는 2학기로 취급
        const key = `${year}-${semester}`;
        if (!creditSums[key]) {
            creditSums[key] = { required: 0, elective: 0, total: 0 };
        }
        const credits = parseInt(course.credits) || 0;
        creditSums[key].total += credits;
        if (course.isRequired === '필수' && course.category !== '교양') {
            creditSums[key].required += credits;
        } else if (course.isRequired === '선택' && course.category !== '교양') {
            creditSums[key].elective += credits;
        }
    });
    
    // 이수모형표 업데이트
    const curriculumTable = document.querySelector('.curriculum-table');
    if (curriculumTable) {
        const rows = curriculumTable.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const firstCell = row.querySelector('td');
            if (!firstCell) return;
            
            const cells = row.querySelectorAll('td');
            
            // 각 행의 과목들 학점 합계 계산
            let rowTotal = 0;
            cells.forEach((cell) => {
                // 실제로 교과목 블록이 들어가는 셀만 계산 (rowspan 등으로 인덱스가 달라져도 무관)
                if (cell.querySelector('.course-block')) {
                    const courseBlocks = cell.querySelectorAll('.course-block');
                    courseBlocks.forEach(block => {
                        // 고스트 블록과 삭제된 블록은 제외
                        if (block.classList.contains('ghost') || block.classList.contains('deleted')) {
                            return;
                        }
                        const courseName = block.dataset.courseName;
                        const course = activeCourses.find(c => c.courseName === courseName);
                        if (course) {
                            rowTotal += parseInt(course.credits) || 0;
                        }
                    });
                }
            });
            
            // 마지막 셀(학점열)에 행의 총 학점 표시
            const lastCell = cells[cells.length - 1];
            if (lastCell) {
                lastCell.textContent = rowTotal > 0 ? rowTotal : '';
            }
            
            // 전공필수 소계 행에 학점 표시
            if (firstCell.textContent.includes('개설 전공필수 소계')) {
                let requiredTotal = 0;
                let requiredCount = 0;
                cells.forEach((cell, index) => {
                    if (index >= 1) { // 2번째 셀부터 (colspan="3" 고려)
                        const year = Math.floor((index - 1) / 2) + 1;
                        const semester = (index - 1) % 2 + 1;
                        const key = `${year}-${semester}`;
                        // 교양을 제외한 전공필수만 합산 (삭제된 교과목과 고스트 블록 제외)
                        const credits = activeCourses.filter(c => {
                            let [y, s] = c.yearSemester.split('-');
                            if (s === '계절') s = '2';
                            return `${y}-${s}` === key && c.isRequired === '필수' && c.category !== '교양';
                        }).reduce((sum, c) => sum + (parseInt(c.credits) || 0), 0);
                        cell.textContent = credits > 0 ? credits : '';
                        requiredTotal += credits;
                        const semesterCourses = activeCourses.filter(c => {
                            let [y, s] = c.yearSemester.split('-');
                            if (s === '계절') s = '2';
                            return `${y}-${s}` === key && c.isRequired === '필수' && c.category !== '교양';
                        });
                        requiredCount += semesterCourses.length;
                    }
                });
                if (lastCell) {
                    if (requiredTotal > 0) {
                        lastCell.textContent = `${requiredTotal}(${requiredCount}과목)`;
                    } else {
                        lastCell.textContent = '';
                    }
                }
            }
            
            // 전공선택 소계 행에 학점 표시
            if (firstCell.textContent.includes('개설 전공선택 소계')) {
                let electiveTotal = 0;
                let electiveCount = 0;
                cells.forEach((cell, index) => {
                    if (index >= 1) { // 2번째 셀부터 (colspan="3" 고려)
                        const year = Math.floor((index - 1) / 2) + 1;
                        const semester = (index - 1) % 2 + 1;
                        const key = `${year}-${semester}`;
                        const credits = creditSums[key]?.elective || 0;
                        cell.textContent = credits > 0 ? credits : '';
                        electiveTotal += credits;
                        if (credits > 0) {
                            const semesterCourses = activeCourses.filter(c => 
                                c.yearSemester === key && c.isRequired === '선택'
                            );
                            electiveCount += semesterCourses.length;
                        }
                    }
                });
                
                if (lastCell) {
                    if (electiveTotal > 0) {
                        lastCell.textContent = `${electiveTotal}(${electiveCount}과목)`;
                    } else {
                        lastCell.textContent = '';
                    }
                }
            }
            
            // 졸업 최저이수학점 행에 전체 학점 표시
            if (firstCell.textContent.includes('졸업 최저이수학점')) {
                let totalCredits = 0;
                let totalCourses = 0;
                
                // 전체 학점과 과목 수 계산
                Object.keys(creditSums).forEach(key => {
                    totalCredits += creditSums[key].total;
                    const semesterCourses = activeCourses.filter(c => c.yearSemester === key);
                    totalCourses += semesterCourses.length;
                });
                
                // 각 학년-학기별 전체 학점 표시
                cells.forEach((cell, index) => {
                    if (index >= 1) { // 2번째 셀부터 (colspan="3" 고려)
                        const year = Math.floor((index - 1) / 2) + 1;
                        const semester = (index - 1) % 2 + 1;
                        const key = `${year}-${semester}`;
                        const credits = creditSums[key]?.total || 0;
                        cell.textContent = credits > 0 ? credits : '';
                    }
                });
                
                // 마지막 셀에 전체 학점 표시
                if (lastCell) {
                    if (totalCredits > 0) {
                        lastCell.textContent = `${totalCredits}(${totalCourses}과목)`;
                    } else {
                        lastCell.textContent = '';
                    }
                }
            }
        });
    }
}

// 교과목의 이수모형표 셀 ID 생성
function getCurriculumCellId(course) {
    const [year, semester] = course.yearSemester.split('-');
    let category = course.category;
    let subCategory = '';
    
    // --- 추가: 표시 강제 플래그가 있으면 무조건 기타 행에 배치 ---
    if (course.forceCurriculumRow === '기타' && course.isRequired === '선택') {
        return `cell-전공선택-기타-${year}-${semester === '계절' ? '2' : semester}`;
    }
    // --- 기존 코드 ...
    // 전공선택 과목 중 설계가 아닌 것은 이론으로 분류 (기타 카테고리 추가)
    if (course.isRequired === '선택' && category !== '설계' && category !== '교양' && category !== '기타') {
        category = '이론';
    }
    
    // 기술 카테고리의 세부 분류
    if (category === '기술') {
        // 기술분야가 이미 설정되어 있으면 그것을 사용
        if (course.techField) {
            subCategory = course.techField;
        } else {
            // 과목명으로 자동 분류
            if (course.courseName.includes('구조')) subCategory = '구조';
            else if (course.courseName.includes('환경')) subCategory = '환경';
            else if (course.courseName.includes('시공')) subCategory = '시공';
            else if (course.courseName.includes('디지털')) subCategory = '디지털';
            else subCategory = '구조'; // 기본값
        }
    }
    
    // 필수/선택에 따른 구분
    const requiredType = course.isRequired === '필수' ? '전공필수' : '전공선택';
    
    // 계절학기 속성을 갖는 교과목은 2학기 셀에 배치
    let targetSemester = semester;
    if (semester === '계절') {
        targetSemester = '2';
    }
    
    // 교양 과목 처리
    if (category === '교양') {
        if (course.isRequired === '선택') {
            return `cell-교양-교양선택-merged`;
        } else {
            return `cell-교양-교양필수-${year}-${targetSemester}`;
        }
    }
    
    // 전공 과목 처리
    if (subCategory) {
        return `cell-${requiredType}-${subCategory}-${year}-${targetSemester}`;
    } else {
        return `cell-${requiredType}-${category}-${year}-${targetSemester}`;
    }
}

// 교과목 블록 생성 (diff/삭제/이동(ghost) 기반)
function createCourseBlock(course, isDeleted = false, isGhost = false) {
    const block = document.createElement('div');
    block.className = 'course-block';
    block.dataset.courseName = course.courseName;
    block.dataset.courseId = course.id;
    
    // 삭제된 교과목인 경우
    if (isDeleted) {
        block.classList.add('deleted');
    } 
    // 원래 위치 흔적(ghost)인 경우
    else if (isGhost) {
        block.classList.add('ghost');
    } 
    // 일반 교과목인 경우
    else {
        // 변경 유형 확인
        const diffSummary = getCurrentDiffSummary();
        const courseChange = diffSummary.find(entry => 
            entry.course && entry.course.id === course.id
        );
        
        // 변경 유형에 따른 클래스 적용
        if (courseChange) {
            switch(courseChange.type) {
                case '추가':
                    block.classList.add('highlighted'); // 초록색 강조
                    break;
                case '수정':
                    // 학년학기가 변경된 경우 moved 클래스 추가
                    const yearSemesterChanged = courseChange.changes.some(c => c.field === 'yearSemester');
                    if (yearSemesterChanged) {
                        block.classList.add('moved');
                    }
                    block.classList.add('modified'); // 파란색 강조
                    break;
            }
        }
    }
    
    // 카테고리별 색상 클래스 추가
    // 공통가치대응 탭이 활성화된 경우 색상 기준 전환 스위치에 따라 결정
    const commonValuesTab = document.getElementById('commonValues');
    const curriculumTab = document.getElementById('curriculum');
    
    if (commonValuesTab && commonValuesTab.classList.contains('active')) {
        if (colorModeBySubjectType) {
            // 과목분류 기준 색상
            const subjectTypeClass = getSubjectTypeClass(course.subjectType);
            if (subjectTypeClass) {
                block.classList.add(`course-block-${subjectTypeClass}`);
            }
        } else {
            // 구분 기준 색상
            const categoryClass = getCategoryClass(course.category);
            if (categoryClass) {
                block.classList.add(`course-block-${categoryClass}`);
            }
        }
    } else if (curriculumTab && curriculumTab.classList.contains('active')) {
        if (colorModeBySubjectTypeCurriculum) {
            // 과목분류 기준 색상
            const subjectTypeClass = getSubjectTypeClass(course.subjectType);
            if (subjectTypeClass) {
                block.classList.add(`course-block-${subjectTypeClass}`);
            }
        } else {
            // 구분 기준 색상
            const categoryClass = getCategoryClass(course.category);
            if (categoryClass) {
                block.classList.add(`course-block-${categoryClass}`);
            }
        }
    } else {
        // 다른 탭에서는 기존대로 구분 기준 색상
        const categoryClass = getCategoryClass(course.category);
        if (categoryClass) {
            block.classList.add(`course-block-${categoryClass}`);
        }
    }
    
    // 설계 교과목의 경우 색상 기준 전환을 위한 추가 클래스 적용
    if (course.category === '설계' && course.subjectType === '설계') {
        const commonValuesTab = document.getElementById('commonValues');
        const curriculumTab = document.getElementById('curriculum');
        
        if (commonValuesTab && commonValuesTab.classList.contains('active')) {
            if (colorModeBySubjectType) {
                // 과목분류 모드에서는 subjectType 기준으로 이미 적용됨
                block.classList.add('color-mode-subject-type');
            } else {
                // 구분 모드에서는 category 기준으로 이미 적용됨
                block.classList.add('color-mode-category');
            }
        } else if (curriculumTab && curriculumTab.classList.contains('active')) {
            if (colorModeBySubjectTypeCurriculum) {
                // 과목분류 모드에서는 subjectType 기준으로 이미 적용됨
                block.classList.add('color-mode-subject-type');
            } else {
                // 구분 모드에서는 category 기준으로 이미 적용됨
                block.classList.add('color-mode-category');
            }
        }
    }
    
    // 교과목 이름 변경 이력 확인
    const diffSummary = getCurrentDiffSummary();
    const courseChange = diffSummary.find(entry => 
        entry.course && entry.course.id === course.id
    );
    
    let originalCourseName = '';
    if (courseChange && courseChange.type === '수정') {
        const nameChange = courseChange.changes.find(change => change.field === 'courseName');
        if (nameChange) {
            originalCourseName = nameChange.before;
        }
    }
    
    // 블록 내용 설정 - 상세내용을 작은 글씨로 표시
    let blockContent = `
        <div class="course-block-title">${course.courseName}<span class="course-credits-text">(${course.credits})</span></div>
    `;
    
    // 이전 교과목 이름이 있으면 표시
    if (originalCourseName && originalCourseName !== course.courseName) {
        blockContent += `
            <div class="course-block-original-name">이전: ${originalCourseName}</div>
        `;
    }
    
    blockContent += `
        <div class="course-block-info">
            ${course.description ? `<span class="course-description">${course.description}</span>` : ''}
        </div>
    `;
    
    block.innerHTML = blockContent;
    
    // 커스텀 툴팁 이벤트 추가 (ghost 블록 제외)
    if (!isGhost) {
        block.addEventListener('mouseenter', (e) => showCourseTooltip(e, course));
        block.addEventListener('mouseleave', hideCourseTooltip);
        block.addEventListener('mousemove', moveCourseTooltip);
    }

    // 삭제된 교과목이나 ghost 블록이 아닌 경우에만 드래그 가능
    if (!isDeleted && !isGhost) {
    updateCourseBlockDraggable(block);
    
    // 드래그 이벤트 리스너 추가
    block.addEventListener('dragstart', handleCourseBlockDragStart);
    block.addEventListener('dragend', handleCourseBlockDragEnd);
    
    // 더블클릭으로 편집
    block.addEventListener('dblclick', () => editCourseBlock(course));
    }
    
    // 현재 설정된 글씨 크기 적용
    block.style.fontSize = currentCurriculumFontSize + 'px';
    
    // 블록 내부 텍스트 요소들의 폰트 사이즈도 업데이트
    const title = block.querySelector('.course-block-title');
    const info = block.querySelector('.course-block-info');
    const originalName = block.querySelector('.course-block-original-name');
    
    if (title) {
        title.style.fontSize = currentCurriculumFontSize + 'px';
    }
    if (info) {
        info.style.fontSize = (currentCurriculumFontSize - 2) + 'px'; // 정보 텍스트는 약간 작게
    }
    if (originalName) {
        originalName.style.fontSize = (currentCurriculumFontSize - 3) + 'px'; // 이전 이름은 더 작게
    }
    
    return block;
}

// --- 커스텀 툴팁 함수들 (최상단에 위치) ---
let tooltipTimer = null;
let isCourseBlockDragging = false; // 드래그 중 여부 플래그 추가

function showCourseTooltip(event, course) {
    if (isCourseBlockDragging) return; // 드래그 중에는 툴팁 표시 안함
    window.hideCourseTooltip(); // 기존 툴팁 제거 및 타이머 취소
    tooltipTimer = setTimeout(() => {
        const tooltip = document.createElement('div');
        tooltip.className = 'custom-course-tooltip';
        tooltip.innerHTML = getCourseTooltipHTML(course);
        document.body.appendChild(tooltip);
        positionCourseTooltip(event, tooltip);
    }, 800);
}
window.showCourseTooltip = showCourseTooltip;

function hideCourseTooltip() {
    if (tooltipTimer) {
        clearTimeout(tooltipTimer);
        tooltipTimer = null;
    }
    const existing = document.querySelector('.custom-course-tooltip');
    if (existing) existing.remove();
}
window.hideCourseTooltip = hideCourseTooltip;

function moveCourseTooltip(event) {
    const tooltip = document.querySelector('.custom-course-tooltip');
    if (tooltip) positionCourseTooltip(event, tooltip);
}
window.moveCourseTooltip = moveCourseTooltip;

function positionCourseTooltip(event, tooltip) {
    const padding = 12;
    const mouseX = event.clientX;
    const mouseY = event.clientY;
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    const scrollX = window.scrollX || document.documentElement.scrollLeft;
    tooltip.style.left = (mouseX + 20 + scrollX) + 'px';
    tooltip.style.top = (mouseY + 20 + scrollY) + 'px';
}

// 교과목 툴팁 HTML 생성 (diff 기반 상태표시 포함)
function getCourseTooltipHTML(course) {
    const matrixValues = matrixData[course.courseName] || new Array(18).fill(0);
    const performanceCriteria = getPerformanceCriteria(matrixValues);
    
    // 변경 상태 확인
    const diffSummary = getCurrentDiffSummary();
    const courseChange = diffSummary.find(entry => 
        entry.course && entry.course.id === course.id
    );
    
    let statusInfo = '';
    
    if (courseChange) {
        switch(courseChange.type) {
            case '삭제':
                statusInfo = '<div class="tooltip-row" style="color: #f44336; font-weight: bold;">🗑️ 삭제된 교과목</div>';
                break;
            case '추가':
                statusInfo = '<div class="tooltip-row" style="color: #4caf50; font-weight: bold;">✨ 새로 추가된 교과목</div>';
                break;
            case '수정':
                const yearSemesterChange = courseChange.changes.find(c => c.field === 'yearSemester');
                if (yearSemesterChange) {
                    statusInfo = `<div class="tooltip-row" style="color: #2196f3; font-weight: bold;">📍 ${yearSemesterChange.before} → ${yearSemesterChange.after}로 이동됨</div>`;
                } else {
                    statusInfo = '<div class="tooltip-row" style="color: #2196f3; font-weight: bold;">✏️ 수정된 교과목</div>';
                }
                break;
        }
    }
    
    return `
        <div class="tooltip-title">${course.courseName}</div>
        ${statusInfo}
        <div class="tooltip-row"><b>담당교수</b>: ${course.professor ? course.professor : '-'}</div>
        <div class="tooltip-row"><b>교과목번호</b>: ${course.courseNumber}</div>
        <div class="tooltip-row"><b>학점</b>: ${course.credits}학점</div>
        <div class="tooltip-row"><b>학년-학기</b>: ${course.yearSemester}</div>
        <div class="tooltip-row"><b>구분</b>: ${course.category}</div>
        <div class="tooltip-row"><b>필수여부</b>: ${course.isRequired}</div>
        ${course.description ? `<div class="tooltip-row"><b>상세내용</b>: ${course.description}</div>` : ''}
        <div class="tooltip-row"><b>수행평가기준</b>:<br>${performanceCriteria.fullText.replace(/, /g, '<br>')}</div>
    `;
}

// --- 기존 코드(createCourseBlock 등) 아래에 유지 ---

// 교과목 블록 드래그 시작
function handleCourseBlockDragStart(e) {
    // 수정모드가 아닌 경우 드래그 방지
    // 현재 활성화된 탭에 따라 적절한 수정모드 버튼 확인
    const curriculumEditModeButton = document.getElementById('editModeToggleCurriculum');
    const commonValuesEditModeButton = document.getElementById('editModeToggleCommonValues');
    
    const isCurriculumEditMode = curriculumEditModeButton && curriculumEditModeButton.classList.contains('active');
    const isCommonValuesEditMode = commonValuesEditModeButton && commonValuesEditModeButton.classList.contains('active');
    
    if (!isCurriculumEditMode && !isCommonValuesEditMode) {
        e.preventDefault();
        return;
    }
    
    e.dataTransfer.setData('text/plain', e.target.dataset.courseName);
    e.target.classList.add('dragging');
    isCourseBlockDragging = true; // 드래그 시작 시 플래그 true
    
    // 공통가치대응 탭에서 드래그 시작한 경우 소스 정보 저장
    const sourceCell = e.target.closest('td');
    if (sourceCell && sourceCell.id && sourceCell.id.startsWith('commonValues-cell-')) {
        e.dataTransfer.setData('sourceCell', sourceCell.id);
    }
    
    // 드래그 시작 시 현재 DOM 순서 로그
    const blockWrap = e.target.closest('.block-wrap');
    if (blockWrap) {
        const currentOrder = Array.from(blockWrap.querySelectorAll('.course-block:not(.ghost):not(.deleted)'))
            .map(block => block.dataset.courseName);
    }
    
    
    // [추가] 공통가치 대응표에서 드래그 시작 시 삭제 ZONE 표시 및 셀 정보 저장
    const courseBlock = e.target.closest('.course-block');
    if (courseBlock) {
        const parentCell = courseBlock.closest('td');
        if (parentCell && parentCell.id && parentCell.id.startsWith('commonValues-cell-')) {
            const cellId = parentCell.id;
            const idParts = cellId.replace('commonValues-cell-', '').split('-');
            
            // value 컬럼에서 드래그하는 경우
            if (idParts[1] && idParts[1].includes('value')) {
                draggedFromCell = {
                    subjectType: idParts[0],
                    valueKey: idParts[1] // value1, value2, value3
                };
                showDeleteZone();
            }
            // 전공필수/선택 컬럼에서 드래그하는 경우도 삭제 가능
            else if (idParts[1] === '필수' || idParts[1] === '선택') {
                draggedFromCell = {
                    subjectType: idParts[0],
                    isRequired: idParts[1] === '필수'
                };
                showDeleteZone();
            }
        }
    }
}

// 교과목 블록 드래그 종료
function handleCourseBlockDragEnd(e) {
    // [추가] 드래그 종료 시 삭제 ZONE 숨기기 및 셀 정보 초기화
    hideDeleteZone();
    draggedFromCell = null;
    
    e.target.classList.remove('dragging');
    isCourseBlockDragging = false; // 드래그 종료 시 플래그 false
    window.hideCourseTooltip(); // 혹시 남아있을 툴팁 제거
    
    // 모든 미리보기 효과 제거
    document.querySelectorAll('.block-wrap').forEach(wrap => {
        clearBlockWrapPreview(wrap);
    });
    
    // 드래그 종료 시 최종 DOM 순서 로그
    const blockWrap = e.target.closest('.block-wrap');
    if (blockWrap) {
        const finalOrder = Array.from(blockWrap.querySelectorAll('.course-block:not(.ghost):not(.deleted)'))
            .map(block => block.dataset.courseName);
    }
    
}

// 교과목 블록 편집
function editCourseBlock(course) {
    // 교과목 인덱스 찾기
    const courseIndex = courses.findIndex(c => c.id === course.id);
    if (courseIndex !== -1) {
        // editCourse 함수를 사용하여 모달 열기
        editCourse(courseIndex);
    } else {
        // id로 찾지 못한 경우 courseName으로 찾기
        const fallbackIndex = courses.findIndex(c => c.courseName === course.courseName);
        if (fallbackIndex !== -1) {
            editCourse(fallbackIndex);
        } else {
            alert('교과목을 찾을 수 없습니다.');
        }
    }
}

// 모달에서 교과목 삭제
function deleteCourseFromModal() {
    const courseName = document.querySelector('input[name="courseName"]').value;
    const courseIndex = courses.findIndex(c => c.courseName === courseName);
    
    if (courseIndex !== -1) {
        if (confirm(`"${courseName}" 교과목을 삭제하시겠습니까?`)) {
            // 공통가치대응 표의 셀 데이터 보존
            const currentCommonValuesData = collectCommonValuesTableData();
            
            // 변경이력 기록 추가
            addChangeHistory('삭제', courseName, []);
            courses.splice(courseIndex, 1);
            
            // 공통가치대응 표의 셀 데이터 복원
            commonValuesCellTexts = currentCommonValuesData;
            
            // 표들 다시 렌더링
            renderCurriculumTable();
            renderCourses();
            renderMatrix();
            renderCommonValuesTable(); // 공통가치대응 탭도 즉시 갱신
            updateStats();
            
            // 모달 닫기
            closeModal();
            
            showToast('교과목이 삭제되었습니다.');
            renderChangeHistoryPanel();
            renderCurriculumTable();
            
            // 화살표 즉시 업데이트
            setTimeout(() => {
                const movedCoursesForGhost = getMovedCoursesForGhost();
                drawMoveArrows(movedCoursesForGhost);
            }, 10);
        }
    } else {
        alert('삭제할 교과목을 찾을 수 없습니다.');
    }
}

// 이수모형 드롭 영역 설정
function setupCurriculumDropZones() {
    const cells = document.querySelectorAll('[id^="cell-"]');
    
    cells.forEach(cell => {
        cell.addEventListener('dragover', handleCurriculumDragOver);
        cell.addEventListener('drop', handleCurriculumDrop);
    });
    
    // 기술분야 특별 드롭존 설정
    const techDropZones = document.querySelectorAll('#curriculum td[id*="-구조-"], #curriculum td[id*="-환경-"], #curriculum td[id*="-시공-"], #curriculum td[id*="-디지털-"]');
    techDropZones.forEach(zone => {
        zone.addEventListener('dragover', handleTechDragOver);
        zone.addEventListener('drop', handleTechDrop);
        zone.addEventListener('dragenter', handleTechDragEnter);
        zone.addEventListener('dragleave', handleTechDragLeave);
    });
}

// 드래그 오버 처리
function handleCurriculumDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

// 드롭 처리
function handleCurriculumDrop(e) {
    e.preventDefault();
    
    // 수정모드가 아닌 경우 드롭 방지
    const editModeButton = document.getElementById('editModeToggleCurriculum');
    const isEditMode = editModeButton && editModeButton.classList.contains('active');
    
    if (!isEditMode) {
        return;
    }
    
    const courseName = e.dataTransfer.getData('text/plain');
    const course = courses.find(c => c.courseName === courseName);
    
    if (!course) return;
    
    // 셀 ID에서 속성 추출
    const cellId = e.target.closest('[id^="cell-"]').id;
    const cellInfo = cellId.split('-'); // 예: ["cell", "전공필수", "설계", "3", "2"]
    let changes = [];
    if (cellInfo.length >= 5) {
        // type, category, year, semester
        const type = cellInfo[1]; // 전공필수/전공선택/교양 등
        let category = cellInfo[2];
        const year = cellInfo[3];
        const semester = cellInfo[4];

        // '기타' 또는 '이론' 셀은 category, techField, isRequired에 영향을 주지 않음
        if (category !== '기타' && category !== '이론') {
            // [명확화] 교양필수 행에 드롭된 경우 필수여부를 무조건 '필수'로 변경
            if (type === '교양필수') {
                if (course.isRequired !== '필수') {
                    const oldIsRequired = course.isRequired;
                    course.isRequired = '필수';
                    changes.push({field: '필수여부', before: oldIsRequired, after: '필수'});
                }
            } else if (type === '전공필수') {
                if (course.isRequired !== '필수') {
                    const oldIsRequired = course.isRequired;
                    course.isRequired = '필수';
                    changes.push({field: '필수여부', before: oldIsRequired, after: '필수'});
                }
            } else {
                if (course.isRequired !== '선택') {
                    const oldIsRequired = course.isRequired;
                    course.isRequired = '선택';
                    changes.push({field: '필수여부', before: oldIsRequired, after: '선택'});
                }
            }

            // 카테고리/기술분야
            const oldCategory = course.category;
            const oldTechField = course.techField;
            if (["설계", "기술", "실무", "건축적사고", "교양"].includes(category)) {
                course.category = category;
                if (oldCategory !== course.category) {
                    changes.push({field: '구분', before: oldCategory, after: course.category});
                }
                // 기술분야 초기화
                if (category !== '기술' && course.techField) {
                    changes.push({field: '기술분야', before: oldTechField, after: ''});
                    delete course.techField;
                }
            } else if (["구조", "환경", "시공", "디지털"].includes(category)) {
                course.category = '기술';
                if (oldCategory !== '기술') {
                    changes.push({field: '구분', before: oldCategory, after: '기술'});
                }
                course.techField = category;
                if (oldTechField !== category) {
                    changes.push({field: '기술분야', before: oldTechField, after: category});
                }
            }

            // 교양 처리
            if (type.startsWith('교양')) {
                const oldCategory2 = course.category;
                course.category = '교양';
                if (oldCategory2 !== '교양') {
                    changes.push({field: '구분', before: oldCategory2, after: '교양'});
                }
            }
        } else {
            // [추가] 이론 또는 기타 행에 드롭된 경우 필수여부를 무조건 '선택'으로 변경
            if (course.isRequired !== '선택') {
                const oldIsRequired = course.isRequired;
                course.isRequired = '선택';
                changes.push({field: '필수여부', before: oldIsRequired, after: '선택'});
            }
        }
        // 학년학기
        const newYearSemester = `${year}-${semester}`;
        const oldYearSemester = course.yearSemester;
        if (oldYearSemester !== newYearSemester) {
            changes.push({field: '학년학기', before: oldYearSemester, after: newYearSemester});
            course.yearSemester = newYearSemester;
        }
    }
    // 기타 행 드롭 여부 판별
    const 기타행매치 = cellId.match(/^cell-전공선택-기타-(\d+)-(\d+)$/);
    if (기타행매치) {
        course.forceCurriculumRow = '기타';
    } else if (course.forceCurriculumRow) {
        delete course.forceCurriculumRow;
    }
    // 변경이력 기록
    if (changes.length > 0) {
        addChangeHistory('수정', course.courseName, changes);
        // [추가] 변경이력 팝업(토스트) 알림
        const changeMsg = `교과목 "${course.courseName}" 속성 변경됨:\n` + changes.map(c => `- ${c.field}: ${c.before} → ${c.after}`).join('\n');
        showToast(changeMsg);
    }
    // 표 다시 렌더링
    renderCurriculumTable();
    renderCourses();
    renderMatrix();
    renderChangeHistoryPanel();
    // 화살표 즉시 업데이트
    setTimeout(() => {
        const movedCoursesForGhost = getMovedCoursesForGhost();
        drawMoveArrows(movedCoursesForGhost);
    }, 10);
}

// 기술분야 드래그 앤 드롭 처리 함수들
function handleTechDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // 기술과목인지 확인
    const courseName = e.dataTransfer.getData('text/plain');
    const course = courses.find(c => c.courseName === courseName);
    
    if (course && course.category === '기술') {
        e.target.style.backgroundColor = '#e3f2fd';
        e.target.style.border = '2px dashed #1976d2';
    }
}

function handleTechDragEnter(e) {
    e.preventDefault();
    
    const courseName = e.dataTransfer.getData('text/plain');
    const course = courses.find(c => c.courseName === courseName);
    
    if (course && course.category === '기술') {
        e.target.style.backgroundColor = '#e3f2fd';
        e.target.style.border = '2px dashed #1976d2';
    }
}

function handleTechDragLeave(e) {
    e.target.style.backgroundColor = '';
    e.target.style.border = '';
}

function handleTechDrop(e) {
    e.preventDefault();
    
    // 수정모드가 아닌 경우 드롭 방지
    const editModeButton = document.getElementById('editModeToggleCurriculum');
    const isEditMode = editModeButton && editModeButton.classList.contains('active');
    
    if (!isEditMode) {
        return;
    }
    
    const courseName = e.dataTransfer.getData('text/plain');
    const course = courses.find(c => c.courseName === courseName);
    
    if (!course || course.category !== '기술') {
        e.target.style.backgroundColor = '';
        e.target.style.border = '';
        return;
    }
    
    // 셀 ID에서 기술분야와 학년-학기 정보 추출
    const cellId = e.target.closest('[id^="cell-"]').id;
    const match = cellId.match(/cell-.*?-(구조|환경|시공|디지털)-(\d+)-(\d+)/);
    
    if (match) {
        const [, techField, year, semester] = match;
        const newYearSemester = `${year}-${semester}`;
        const oldYearSemester = course.yearSemester;
        
        // 기술분야별 적절한 셀에 배치
        if (oldYearSemester !== newYearSemester) {
            // 변경 이력 기록
            addChangeHistory('수정', course.courseName, [
                {field: '학년학기', before: oldYearSemester, after: newYearSemester},
                {field: '기술분야', before: '일반', after: techField}
            ]);
        }
        
        // 기술분야별 과목 분류
        classifyTechCourse(course, techField);
        
        // 교과목의 학년-학기 정보 업데이트
        course.yearSemester = newYearSemester;
        
        // 표 다시 렌더링
        renderCurriculumTable();
        // 교과목 관리 테이블도 업데이트
        renderCourses();
        // 수행평가매트릭스도 업데이트
        renderMatrix();
        
        renderChangeHistoryPanel();
        
        // 화살표 즉시 업데이트
        setTimeout(() => {
            const movedCoursesForGhost = getMovedCoursesForGhost();
            drawMoveArrows(movedCoursesForGhost);
        }, 10);
        
        // 스타일 초기화
        e.target.style.backgroundColor = '';
        e.target.style.border = '';
    }
}

// 기술과목 분류 함수
function classifyTechCourse(course, techField) {
    // 기술과목들을 기술분야별로 분류
    const techCourseClassification = {
        '구조': ['건축구조의이해', '건축구조디자인'],
        '환경': ['건축환경계획', '건축설비계획'],
        '시공': ['건축재료와응용', '건축시공학개론'],
        '디지털': ['빌딩시스템']
    };
    
    // 과목이 해당 기술분야에 속하는지 확인
    if (techCourseClassification[techField] && techCourseClassification[techField].includes(course.courseName)) {
        course.techField = techField;
    } else {
        // 기본적으로는 구조분야로 분류 (필요시 수정)
        course.techField = techField;
    }
}

// --- 셀 내부 블럭 수동 정렬 기능 ---
function setupBlockWrapDragEvents() {
    // 모든 block-wrap에 드래그 이벤트 연결
    document.querySelectorAll('.block-wrap').forEach(wrap => {
        wrap.addEventListener('dragover', handleBlockWrapDragOver);
        wrap.addEventListener('dragleave', handleBlockWrapDragLeave);
        wrap.addEventListener('drop', handleBlockWrapDrop);
    });
}

// block-wrap 드래그 오버 - 밀림 효과 (깜박임 방지)
function handleBlockWrapDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const draggingBlock = document.querySelector('.course-block.dragging');
    if (!draggingBlock) return;
    
    const blockWrap = e.currentTarget;
    const targetBlock = e.target.closest('.course-block');
    
    // 프리뷰 블럭 가져오기 또는 생성
    let previewBlock = blockWrap.querySelector('.drag-preview-block');
    if (!previewBlock) {
        previewBlock = draggingBlock.cloneNode(true);
        previewBlock.classList.add('drag-preview-block');
        previewBlock.classList.remove('dragging');
        previewBlock.style.opacity = '0.8';
        previewBlock.style.transform = 'scale(0.95)';
        previewBlock.style.boxShadow = '0 2px 8px rgba(246, 0, 0, 0.97)';
        previewBlock.style.border = '2px dashed #28a745';
        previewBlock.style.background = '#f8fff9';
        previewBlock.style.pointerEvents = 'none';
        previewBlock.style.position = 'relative';
        previewBlock.style.zIndex = '5';
        previewBlock.style.transition = 'none'; // 깜박임 방지
    }
    
    // 모든 블럭 초기화 (한 번만)
    if (!blockWrap.dataset.initialized) {
        blockWrap.querySelectorAll('.course-block').forEach(block => {
            if (block !== draggingBlock) {
                block.style.transform = '';
                block.style.transition = 'all 0.3s ease';
                block.style.boxShadow = '';
                block.style.border = '';
                block.style.background = '';
                block.style.opacity = '';
            }
        });
        blockWrap.dataset.initialized = 'true';
    }
    
    if (targetBlock && targetBlock !== draggingBlock && blockWrap.contains(targetBlock)) {
        const rect = targetBlock.getBoundingClientRect();
        const mouseY = e.clientY;
        const blockCenterY = rect.top + rect.height / 2;
        const dropPosition = mouseY < blockCenterY ? 'before' : 'after';
        
        // 프리뷰 블럭 위치 업데이트 (DOM 조작 최소화)
        const currentPreviewParent = previewBlock.parentNode;
        const targetParent = targetBlock.parentNode;
        
        if (currentPreviewParent !== targetParent) {
            // 다른 block-wrap으로 이동한 경우
            if (dropPosition === 'before') {
                targetParent.insertBefore(previewBlock, targetBlock);
            } else {
                const nextSibling = targetBlock.nextElementSibling;
                if (nextSibling && nextSibling.classList.contains('course-block')) {
                    targetParent.insertBefore(previewBlock, nextSibling);
                } else {
                    targetParent.appendChild(previewBlock);
                }
            }
        } else {
            // 같은 block-wrap 내에서 위치만 변경
            const currentIndex = Array.from(targetParent.children).indexOf(previewBlock);
            const targetIndex = Array.from(targetParent.children).indexOf(targetBlock);
            const newIndex = dropPosition === 'before' ? targetIndex : targetIndex + 1;
            
            if (currentIndex !== newIndex && currentIndex !== newIndex - 1) {
                if (dropPosition === 'before') {
                    targetParent.insertBefore(previewBlock, targetBlock);
                } else {
                    const nextSibling = targetBlock.nextElementSibling;
                    if (nextSibling && nextSibling.classList.contains('course-block')) {
                        targetParent.insertBefore(previewBlock, nextSibling);
                    } else {
                        targetParent.appendChild(previewBlock);
                    }
                }
            }
        }
        
        // 기존 블럭들 밀림 효과 적용
        const allBlocks = Array.from(blockWrap.querySelectorAll('.course-block:not(.dragging):not(.drag-preview-block)'));
        const targetIndex = allBlocks.indexOf(targetBlock);
        
        allBlocks.forEach((block, index) => {
            if (dropPosition === 'before' && index >= targetIndex) {
                block.style.transform = 'translateY(8px)';
                block.style.transition = 'transform 0.3s ease';
            } else if (dropPosition === 'after' && index > targetIndex) {
                block.style.transform = 'translateY(8px)';
                block.style.transition = 'transform 0.3s ease';
            } else {
                block.style.transform = '';
                block.style.transition = 'transform 0.3s ease';
            }
        });
        
        
    } else {
        // 빈 영역에 드래그 중일 때
        if (!blockWrap.contains(previewBlock)) {
            blockWrap.appendChild(previewBlock);
        }

    }
    

}

// block-wrap 드래그 리브
function handleBlockWrapDragLeave(e) {
    const blockWrap = e.currentTarget;
    const relatedTarget = e.relatedTarget;
    
    // block-wrap을 벗어났을 때만 미리보기 효과 제거
    if (!blockWrap.contains(relatedTarget)) {
        clearBlockWrapPreview(blockWrap);
    }
}

// 미리보기 효과 제거 함수 - 밀림 효과용 (깜박임 방지)
function clearBlockWrapPreview(blockWrap) {
    // 프리뷰 블럭 제거
    const previewBlock = blockWrap.querySelector('.drag-preview-block');
    if (previewBlock) {
        previewBlock.remove();
    }
    
    // 모든 블럭의 스타일 초기화
    blockWrap.querySelectorAll('.course-block').forEach(block => {
        block.style.transform = '';
        block.style.transition = '';
        block.style.boxShadow = '';
        block.style.opacity = '';
        block.style.border = '';
        block.style.background = '';
    });
    
    // 초기화 플래그 제거
    delete blockWrap.dataset.initialized;
    
    // 셀 하이라이트 제거
    const cell = blockWrap.closest('td');
    if (cell) {
        cell.classList.remove('cell-highlight');
        cell.style.background = '';
        cell.style.border = '';
    }
}

// block-wrap 드롭 (셀 내부 순서 변경)
function handleBlockWrapDrop(e) {
    e.preventDefault();
    
    const draggingBlock = document.querySelector('.course-block.dragging');
    if (!draggingBlock) return;
    
    const blockWrap = e.currentTarget;
    const targetBlock = e.target.closest('.course-block');
    const previewBlock = blockWrap.querySelector('.drag-preview-block');
    
    // 공통가치 대응표의 value 컬럼으로 드롭하는 경우는 처리하지 않음
    // (handleCommonValuesDrop에서 별도 처리)
    const td = blockWrap.closest('td');
    if (td && td.id && td.id.includes('commonValues-cell-') && td.id.includes('-value')) {
        // 미리보기 효과만 제거하고 종료
        clearBlockWrapPreview(blockWrap);
        return;
    }
    
    // 프리뷰 블럭이 있으면 그 위치에 드롭
    if (previewBlock) {
        const previewIndex = Array.from(blockWrap.children).indexOf(previewBlock);
        blockWrap.insertBefore(draggingBlock, previewBlock);
    }
    // 같은 셀 내부에서만 순서 변경 허용 (기존 로직 유지)
    else if (targetBlock && targetBlock !== draggingBlock && blockWrap.contains(targetBlock)) {
        const rect = targetBlock.getBoundingClientRect();
        const mouseY = e.clientY;
        const blockCenterY = rect.top + rect.height / 2;
        
        const dropPosition = mouseY < blockCenterY ? 'before' : 'after';
        
        if (dropPosition === 'before') {
            blockWrap.insertBefore(draggingBlock, targetBlock);
        } else {
            const nextSibling = targetBlock.nextElementSibling;
            if (nextSibling && nextSibling.classList.contains('course-block')) {
                blockWrap.insertBefore(draggingBlock, nextSibling);
            } else {
                blockWrap.appendChild(draggingBlock);
            }
        }
    }
    
    // courses 배열 순서 동기화
    updateCoursesOrderFromDOM();
    
    // 미리보기 효과 제거
    clearBlockWrapPreview(blockWrap);
}

// DOM 순서대로 courses 배열 재정렬
function updateCoursesOrderFromDOM() {
    const newOrder = [];
    const processedIds = new Set();
    
    // 모든 셀의 block-wrap을 순회하며, DOM 순서대로 courses 배열 재정렬
    document.querySelectorAll('.block-wrap').forEach(wrap => {
        const blocks = wrap.querySelectorAll('.course-block:not(.ghost):not(.deleted)');
        blocks.forEach(block => {
            const courseId = block.dataset.courseId;
            if (courseId && !processedIds.has(courseId)) {
                const course = courses.find(c => c.id === courseId);
                if (course) {
                    newOrder.push(course);
                    processedIds.add(courseId);
                }
            }
        });
    });
    
    // 기존 courses에 있지만 DOM에 없는 교과목(숨겨진 등)도 유지
    courses.forEach(course => { 
        if (!processedIds.has(course.id)) {
            newOrder.push(course);
        }
    });
    
    // courses 배열 업데이트
    const oldOrder = courses.map(c => c.id);
    courses = newOrder;
    const newOrderIds = courses.map(c => c.id);
}

// 이수모형 폰트 사이즈 조정 기능
let currentCurriculumFontSize = parseInt(localStorage.getItem('currentCurriculumFontSize')) || 14;

function increaseCurriculumFontSize() {
    if (currentCurriculumFontSize < 20) {
        currentCurriculumFontSize += 1;
        updateCurriculumFontSize();
    }
}

function decreaseCurriculumFontSize() {
    if (currentCurriculumFontSize > 10) {
        currentCurriculumFontSize -= 1;
        updateCurriculumFontSize();
    }
}

function updateCurriculumFontSize() {
    const curriculumTable = document.querySelector('.curriculum-table');
    const fontDisplay = document.getElementById('curriculum-font-size-display');
    
    if (curriculumTable) {
        curriculumTable.style.fontSize = currentCurriculumFontSize + 'px';
        // 헤더와 셀의 폰트 사이즈도 업데이트
        const headers = curriculumTable.querySelectorAll('th');
        const cells = curriculumTable.querySelectorAll('td');
        
        headers.forEach(header => {
            header.style.fontSize = currentCurriculumFontSize + 'px';
        });
        
        cells.forEach(cell => {
            cell.style.fontSize = currentCurriculumFontSize + 'px';
        });
        
        // 교과목 블록의 폰트 사이즈도 업데이트
        const courseBlocks = curriculumTable.querySelectorAll('.course-block');
        courseBlocks.forEach(block => {
            block.style.fontSize = currentCurriculumFontSize + 'px';
            
            // 블록 내부 텍스트 요소들의 폰트 사이즈도 업데이트
            const title = block.querySelector('.course-block-title');
            const info = block.querySelector('.course-block-info');
            const originalName = block.querySelector('.course-block-original-name');
            
            if (title) {
                title.style.fontSize = currentCurriculumFontSize + 'px';
            }
            if (info) {
                info.style.fontSize = (currentCurriculumFontSize - 2) + 'px'; // 정보 텍스트는 약간 작게
            }
            if (originalName) {
                originalName.style.fontSize = (currentCurriculumFontSize - 3) + 'px'; // 이전 이름은 더 작게
            }
        });
    }
    
    if (fontDisplay) {
        fontDisplay.textContent = currentCurriculumFontSize + 'px';
    }
    
    // localStorage에 저장
    localStorage.setItem('currentCurriculumFontSize', currentCurriculumFontSize.toString());
    
    // 화살표 즉시 업데이트
    setTimeout(() => {
        const movedCoursesForGhost = getMovedCoursesForGhost();
        drawMoveArrows(movedCoursesForGhost);
    }, 10);
}

// 교과목 블록의 드래그 가능 여부 업데이트
function updateCourseBlockDraggable(block) {
    // 현재 활성화된 탭에 따라 적절한 수정모드 확인
    const curriculumEditModeButton = document.getElementById('editModeToggleCurriculum');
    const commonValuesEditModeButton = document.getElementById('editModeToggleCommonValues');
    
    const isCurriculumEditMode = curriculumEditModeButton && curriculumEditModeButton.classList.contains('active');
    const isCommonValuesEditMode = commonValuesEditModeButton && commonValuesEditModeButton.classList.contains('active');
    
    // 둘 중 하나라도 수정모드이면 드래그 가능
    block.draggable = isCurriculumEditMode || isCommonValuesEditMode;
}

// 모든 교과목 블록의 드래그 가능 여부 업데이트 (삭제/ghost 블록은 드래그 불가능)
function updateAllCourseBlocksDraggable() {
    const courseBlocks = document.querySelectorAll('.course-block');
    courseBlocks.forEach(block => {
        // 삭제된 블록이나 ghost 블록은 드래그 불가능
        if (block.classList.contains('deleted')) {
            block.draggable = false;
            block.style.cursor = 'not-allowed';
        } else if (block.classList.contains('ghost')) {
            block.draggable = false;
            block.style.cursor = 'default';
        } else {
        updateCourseBlockDraggable(block);
        }
    });
}

// 이수모형 탭 수정모드 토글
function toggleEditModeCurriculum() {
    isEditModeCurriculum = !isEditModeCurriculum;
    const button = document.getElementById('editModeToggleCurriculum');
    const textSpan = document.getElementById('editModeTextCurriculum');
    
    if (isEditModeCurriculum) {
        // 수정모드 활성화
        button.classList.add('active');
        textSpan.textContent = '수정모드';
    } else {
        // 수정모드 비활성화
        button.classList.remove('active');
        textSpan.textContent = '일반모드';
    }
    
    // 버전 버튼 토글
    const versionButtons = document.querySelectorAll('.curriculum-version-btn');
    versionButtons.forEach(btn => {
        btn.style.display = isEditModeCurriculum ? '' : 'none';
    });
    
    // 교과목 추가 버튼 토글
    const addButton = document.querySelector('.curriculum-add-btn');
    if (addButton) {
        addButton.style.display = isEditModeCurriculum ? '' : 'none';
    }
    
    // 제목 편집 가능 여부 설정
    setCurriculumTitleEditable(isEditModeCurriculum);
    
    // 셀 편집 가능 여부 설정
    if (isEditModeCurriculum) {
        enableCurriculumCellEditing();
    } else {
        disableCurriculumCellEditing();
    }
    
    // 모든 교과목 블록의 드래그 가능 여부 업데이트
    updateAllCourseBlocksDraggable();
}

// 이수모형 전체 화면 토글
function toggleCurriculumFullscreen() {
    const curriculumContent = document.getElementById('curriculum');
    const fullscreenText = document.getElementById('curriculum-fullscreen-text');
    
    if (curriculumContent.classList.contains('fullscreen-active')) {
        curriculumContent.classList.remove('fullscreen-active');
        fullscreenText.textContent = '전체 화면';
    } else {
        curriculumContent.classList.add('fullscreen-active');
        fullscreenText.textContent = '화면 축소';
    }
}

// 이수모형 Excel 내보내기
function exportCurriculumToExcel() {
    const table = document.querySelector('.curriculum-table');
    if (!table) return;
    
    // SheetJS 라이브러리 확인
    if (typeof XLSX === 'undefined') {
        alert('엑셀 내보내기 기능을 사용하려면 SheetJS 라이브러리가 필요합니다.');
        return;
    }
    
    // 워크북 생성
    const wb = XLSX.utils.book_new();
    
    // 데이터 배열 생성
    const data = [];
    
    // 테이블 제목 추가
    const curriculumTitle = document.getElementById('curriculumTitle');
    if (curriculumTitle && curriculumTitle.textContent.trim()) {
        data.push([curriculumTitle.textContent.trim()]);
        data.push([]); // 빈 행 추가
    }
    
    const rows = table.querySelectorAll('tr');
    
    rows.forEach((row, rowIndex) => {
        const cells = row.querySelectorAll('th, td');
        const rowData = [];
        
        cells.forEach((cell, cellIndex) => {
            let text = cell.textContent || cell.innerText || '';
            
            // 셀 병합 정보 확인
            const colspan = cell.getAttribute('colspan');
            const rowspan = cell.getAttribute('rowspan');
            
            // 빈 셀 처리 (병합된 셀의 경우)
            if (text.trim() === '' && (colspan || rowspan)) {
                text = '';
            }
            
            // 줄바꿈 유지 (엑셀에서는 \n을 줄바꿈으로 인식)
            text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n'); // 줄바꿈 통일
            text = text.replace(/[ \t]+/g, ' ').trim(); // 연속 공백 제거 (줄바꿈 제외)
            
            rowData.push(text);
        });
        
        // 빈 행이 아닌 경우에만 추가
        if (rowData.some(cell => cell !== '')) {
            data.push(rowData);
        }
    });
    
    // 워크시트 생성
    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // 셀 병합 정보 처리
    const merges = [];
    let mergeRowIndex = 0;
    
    rows.forEach((row, rowIndex) => {
        const cells = row.querySelectorAll('th, td');
        let mergeColIndex = 0;
        
        cells.forEach((cell, cellIndex) => {
            const colspan = parseInt(cell.getAttribute('colspan')) || 1;
            const rowspan = parseInt(cell.getAttribute('rowspan')) || 1;
            
            if (colspan > 1 || rowspan > 1) {
                merges.push({
                    s: { r: mergeRowIndex, c: mergeColIndex },
                    e: { r: mergeRowIndex + rowspan - 1, c: mergeColIndex + colspan - 1 }
                });
            }
            
            mergeColIndex += colspan;
        });
        
        mergeRowIndex++;
    });
    
    if (merges.length > 0) {
        ws['!merges'] = merges;
    }
    
    // 열 너비 자동 조정
    const colWidths = [];
    data.forEach(row => {
        row.forEach((cell, colIndex) => {
            if (!colWidths[colIndex]) colWidths[colIndex] = 0;
            const cellLength = String(cell).length;
            colWidths[colIndex] = Math.max(colWidths[colIndex], cellLength);
        });
    });
    
    ws['!cols'] = colWidths.map(width => ({ width: Math.min(Math.max(width + 2, 8), 50) }));
    
    // 워크북에 워크시트 추가
    XLSX.utils.book_append_sheet(wb, ws, '이수모형');
    
    // 파일명에 현재 날짜 추가
    const now = new Date();
    const dateStr = now.getFullYear() + 
                   String(now.getMonth() + 1).padStart(2, '0') + 
                   String(now.getDate()).padStart(2, '0');
    const filename = `이수모형_${dateStr}.xlsx`;
    
    // 파일 다운로드
    XLSX.writeFile(wb, filename);
}

// 이수모형 PDF 내보내기
function exportCurriculumToPDF() {
    const table = document.querySelector('.curriculum-table');
    if (!table) return;
    
    // jsPDF 라이브러리 확인
    if (typeof window.jsPDF === 'undefined') {
        alert('PDF 내보내기 기능을 사용하려면 jsPDF 라이브러리가 필요합니다.');
        return;
    }
    
    // jsPDF 인스턴스 생성 (가로 방향)
    const { jsPDF } = window.jsPDF;
    const doc = new jsPDF('landscape', 'mm', 'a4');
    
    // 페이지 크기 설정
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    
    // 제목 추가
    const curriculumTitle = document.getElementById('curriculumTitle');
    const titleText = curriculumTitle ? curriculumTitle.textContent.trim() : '건축학전공 교과과정 이수모형';
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(titleText, pageWidth / 2, margin + 10, { align: 'center' });
    
    // 테이블 데이터 추출
    const tableData = [];
    const rows = table.querySelectorAll('tr');
    
    rows.forEach(row => {
        const rowData = [];
        const cells = row.querySelectorAll('th, td');
        
        cells.forEach(cell => {
            let text = cell.textContent || cell.innerText || '';
            // 줄바꿈 처리
            text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
            rowData.push(text);
        });
        
        if (rowData.some(cell => cell !== '')) {
            tableData.push(rowData);
        }
    });
    
    // 테이블 스타일 설정
    const tableConfig = {
        startY: margin + 20,
        styles: {
            fontSize: 7,
            cellPadding: 2,
            lineColor: [0, 0, 0],
            lineWidth: 0.1,
            textColor: [0, 0, 0]
        },
        headStyles: {
            fillColor: [44, 62, 80],
            textColor: [255, 255, 255],
            fontSize: 8,
            fontStyle: 'bold'
        },
        alternateRowStyles: {
            fillColor: [245, 245, 245]
        },
        didDrawCell: function(data) {
            // 셀 내용이 긴 경우 줄바꿈 처리
            if (data.cell.text && data.cell.text.length > 15) {
                const lines = doc.splitTextToSize(data.cell.text, data.cell.width - 4);
                if (lines.length > 1) {
                    data.cell.text = lines;
                }
            }
        }
    };
    
    // 테이블 그리기
    doc.autoTable({
        ...tableConfig,
        body: tableData.slice(1), // 헤더 제외
        head: [tableData[0]] // 첫 번째 행을 헤더로
    });
    
    // 파일명에 현재 날짜 추가
    const now = new Date();
    const dateStr = now.getFullYear() + 
                   String(now.getMonth() + 1).padStart(2, '0') + 
                   String(now.getDate()).padStart(2, '0');
    const filename = `이수모형_${dateStr}.pdf`;
    
    // PDF 저장
    doc.save(filename);
}

// ===== 전체 버전 관리 함수들 =====

// 모든 버전 데이터 로드
function loadAllVersions() {
    try {
        // 먼저 일반 방식으로 저장된 버전 데이터 로드 시도
        const savedVersions = localStorage.getItem('uosVersions');
        if (savedVersions) {
            versions = JSON.parse(savedVersions);
        } else {
            // 분할 저장된 버전 데이터 로드 시도
            const versionsList = localStorage.getItem('uosVersionsList');
            if (versionsList) {
                const versionNames = JSON.parse(versionsList);
                versions = {};
                
                // 각 버전 데이터 로드
                versionNames.forEach(vName => {
                    const versionData = localStorage.getItem(`uosVersion_${vName}`);
                    if (versionData) {
                        const parsedData = JSON.parse(versionData);
                        Object.assign(versions, parsedData);
                    }
                });
                
            }
        }
        
        // 현재 버전 로드 (Firebase에서 로드되지 않은 경우에만)
        if (!currentVersion) {
            const savedCurrentVersion = localStorage.getItem('uosCurrentVersion');
            if (savedCurrentVersion) {
                currentVersion = savedCurrentVersion;
            }
        }
        
        // Firebase에서 로드되지 않은 경우 최근 버전 자동 선택
        if (!currentVersion || currentVersion === '기본') {
            selectLatestVersion();
        }
        
        // 모든 버전 데이터에 대해 구조 검증 및 복구
        Object.keys(versions).forEach(vName => {
            const v = versions[vName];
            
            // 탭 구조로 변환되지 않은 이전 버전 데이터 처리
            if (!v.coursesTab && !v.matrixTab && !v.curriculumTab && !v.commonValuesTab) {
                versions[vName] = {
                    coursesTab: {
                        courses: v.courses || [],
                        initialCourses: v.initialCourses || []
                    },
                    matrixTab: {
                        matrixData: v.matrixData || {},
                        matrixTitleText: v.matrixTitleText || '',
                        matrixExtraTableData: v.matrixExtraTableData || {}
                    },
                    curriculumTab: {
                        curriculumTitleText: v.curriculumTitleText || '',
                        curriculumCellTexts: v.curriculumCellTexts || {},


                    },
                    commonValuesTab: {
                        commonValuesTitleText: v.commonValuesTitleText || '',
                        commonValuesCellTexts: v.commonValuesCellTexts || {},
                        commonValuesCopiedBlocks: v.commonValuesCopiedBlocks || {}
                    },
                    settings: {
                        designSettings: v.designSettings || {},
                        changeHistory: v.changeHistory || []
                    },
                    metadata: {
                        description: v.description || '',
                        saveDate: v.saveDate || new Date().toISOString(),
                        timestamp: v.timestamp || Date.now()
                    }
                };
            }
            
            // 필요한 속성이 없는 경우 초기화
            if (!versions[vName].coursesTab) versions[vName].coursesTab = {};
            if (!versions[vName].matrixTab) versions[vName].matrixTab = {};
            if (!versions[vName].curriculumTab) versions[vName].curriculumTab = {};
            if (!versions[vName].commonValuesTab) versions[vName].commonValuesTab = {};
            if (!versions[vName].settings) versions[vName].settings = {};
            if (!versions[vName].metadata) versions[vName].metadata = {};
        });
        
        updateCurrentVersionDisplay();
    } catch (error) {
        alert('버전 데이터 로드 중 오류가 발생했습니다.');
    }
}

// 현재 버전 표시 업데이트
function updateCurrentVersionDisplay() {
    const versionElement = document.getElementById('currentVersion');
    if (versionElement) {
        versionElement.textContent = currentVersion;
    }
    updateAllVersionLabels();
}

// 전체 데이터를 현재 버전으로 저장
function saveCurrentVersion() {
    // 버전 저장 직전에 항상 표의 모든 셀을 수집
    matrixExtraTableData = collectMatrixExtraTableData();
    
    const versionData = {
        // 교과목 관리 탭 - 교과목 데이터
        courses: courses,
        
        // 수행평가 매트릭스 탭 - 매트릭스 데이터
        matrixData: matrixData,
        
        // 이수모형 탭 - 셀 텍스트 데이터
        curriculumCellTexts: curriculumCellTexts,
        
        // 매트릭스 하부 안내 표 데이터
        matrixExtraTableData: matrixExtraTableData,
        
        // 공통가치대응 탭 - 셀 텍스트 데이터
        commonValuesCellTexts: commonValuesCellTexts,
        
        // 공통가치대응 탭 - 노드 그룹 속성 데이터 (value1,2,3 컬럼의 교과목 블록 정보)
        commonValuesCopiedBlocks: commonValuesCopiedBlocks,
        
        // 제목 텍스트들
        matrixTitleText: localStorage.getItem('matrixTitleText') || '',
        curriculumTitleText: localStorage.getItem('curriculumTitleText') || '',
        commonValuesTitleText: localStorage.getItem('commonValuesTitleText') || '',
        
        // 디자인 설정
        designSettings: designSettings,
        

        
        // 기타 데이터
        initialCourses: initialCourses,
        changeHistory: getCurrentDiffSummary(),
        
        // 메타데이터
        saveDate: new Date().toISOString()
    };
    
    versions[currentVersion] = versionData;
    localStorage.setItem('uosVersions', JSON.stringify(versions));
    localStorage.setItem('uosCurrentVersion', currentVersion);
    
    // Firebase에 저장
    saveDataToFirebase('versions', versions);
    saveDataToFirebase('currentVersion', currentVersion);
    
    showToast('현재 버전이 저장되었습니다.');
}

// 버전 저장/내보내기 모달 표시
function saveVersion() {
    const modal = document.getElementById('versionSaveModal');
    if (modal) {
        modal.style.display = 'block';
        
        // 현재 날짜/시간을 년월일_시:분:초 형식으로 포맷팅
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        
        const defaultName = `${year}${month}${day}_${hours}:${minutes}:${seconds}`;
        
        // 현재 데이터 요약 정보 생성
        let courseCount = Array.isArray(courses) ? courses.length : 0;
        let matrixDataCount = typeof matrixData === 'object' ? Object.keys(matrixData).length : 0;
        let curriculumCellCount = typeof curriculumCellTexts === 'object' ? Object.keys(curriculumCellTexts).length : 0;
        let commonValuesCount = typeof commonValuesCellTexts === 'object' ? Object.keys(commonValuesCellTexts).length : 0;
        
        // 요약 정보 표시
        const summaryElement = document.getElementById('versionSaveSummary');
        if (summaryElement) {
            const formattedDate = `${year}${month}${day}_${hours}:${minutes}:${seconds}`;
            summaryElement.innerHTML = `
                <div class="alert alert-info">
                    <strong>저장할 데이터 요약:</strong><br>
                    - 교과목: ${courseCount}개<br>
                    - 매트릭스 데이터: ${matrixDataCount}개<br>
                    - 이수모형 셀: ${curriculumCellCount}개<br>
                    - 공통가치 셀: ${commonValuesCount}개<br>
                    <small>현재 시간: ${formattedDate}</small>
                </div>
            `;
        }
        
        // 입력 필드 초기화
        document.getElementById('versionNameInput').value = defaultName;
        document.getElementById('versionDescriptionInput').value = '';
        

        
        // 현재 버전 표시
        const currentVersionElement = document.getElementById('currentVersionDisplay');
        if (currentVersionElement) {
            currentVersionElement.textContent = currentVersion;
        }
    }
}

// 버전 저장 모달 닫기
function closeVersionSaveModal() {
    const modal = document.getElementById('versionSaveModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// 버전 데이터 저장 (임시 저장소에서 실제 저장소로 이동)

async function saveVersionData(event) {
    event.preventDefault();


    
    const versionName = document.getElementById('versionNameInput').value.trim();
    const versionDescription = document.getElementById('versionDescriptionInput').value.trim();
    
    if (!versionName) {
        alert('버전 이름을 입력해주세요.');
        return;
    }
    
    if (versions[versionName] && !confirm(`'${versionName}' 버전이 이미 존재합니다. 덮어쓰시겠습니까?`)) {
            return;
        }
    
    try {
        // 임시 저장소의 데이터를 실제 저장소로 이동 (깊은 복사 적용)
        if (tempCourses.length > 0) {
            courses = JSON.parse(JSON.stringify(tempCourses));
            tempCourses = [];
        }
        
        if (Object.keys(tempMatrixData).length > 0) {
            
            // 매트릭스 제목 변경사항 처리
            if (tempMatrixData._titleChanged) {
                localStorage.setItem('matrixTitleText', tempMatrixData._newTitle);
                delete tempMatrixData._titleChanged;
                delete tempMatrixData._oldTitle;
                delete tempMatrixData._newTitle;
            }
            
            // tempMatrixData에서 제목 관련 속성들을 제외한 실제 matrixData만 추출
            const actualMatrixData = { ...tempMatrixData };
            delete actualMatrixData._titleChanged;
            delete actualMatrixData._oldTitle;
            delete actualMatrixData._newTitle;
            
            // --- 필터링 추가: courses에 없는 과목은 제외 ---
            const validCourseNames = new Set(courses.map(c => c.courseName));
            Object.keys(actualMatrixData).forEach(name => {
                if (!validCourseNames.has(name)) {
                    delete actualMatrixData[name];
                }
            });
            
            matrixData = JSON.parse(JSON.stringify(actualMatrixData));
            tempMatrixData = {};
        } else {
            // tempMatrixData가 비어있으면 현재 matrixData를 그대로 유지
            // --- 필터링 추가: courses에 없는 과목은 제외 ---
            const validCourseNames = new Set(courses.map(c => c.courseName));
            Object.keys(matrixData).forEach(name => {
                if (!validCourseNames.has(name)) {
                    delete matrixData[name];
                }
            });
        }
        
        if (Object.keys(tempCurriculumCellTexts).length > 0) {
            // 이수모형 제목 변경사항 처리
            if (tempCurriculumCellTexts._titleChanged) {
                localStorage.setItem('curriculumTitleText', tempCurriculumCellTexts._newTitle);
                delete tempCurriculumCellTexts._titleChanged;
                delete tempCurriculumCellTexts._oldTitle;
                delete tempCurriculumCellTexts._newTitle;
            }
            
            // 임시 저장소와 현재 표 데이터를 병합
            const currentCurriculumData = collectCurriculumTableData();
            curriculumCellTexts = { ...currentCurriculumData, ...tempCurriculumCellTexts };
            tempCurriculumCellTexts = {};
        } else {
            // 임시 저장소에 데이터가 없으면 현재 표의 모든 셀 내용을 수집
            curriculumCellTexts = collectCurriculumTableData();
        }
        
        if (Object.keys(tempCommonValuesCellTexts).length > 0) {
            
            // 공통가치대응 제목 변경사항 처리
            if (tempCommonValuesCellTexts._titleChanged) {
                localStorage.setItem('commonValuesTitleText', tempCommonValuesCellTexts._newTitle);
                delete tempCommonValuesCellTexts._titleChanged;
                delete tempCommonValuesCellTexts._oldTitle;
                delete tempCommonValuesCellTexts._newTitle;
            }
            
            // 임시 저장소와 현재 표 데이터를 병합 (2차원 구조만 유지)
            const currentCommonValuesData = collectCommonValuesTableData();
            
            // 1차원 key 제거하고 2차원 구조만 유지
            const cleanedTempData = {};
            Object.entries(tempCommonValuesCellTexts).forEach(([key, value]) => {
                if (key.includes('-cell-') && key.includes('-value')) {
                    // 1차원 key는 무시 (예: "commonValues-cell-설계-value1")
                } else if (typeof value === 'object' && value !== null) {
                    // 2차원 구조는 유지 (예: {"설계": {"value1": "a"}})
                    cleanedTempData[key] = value;
                }
            });
            
            commonValuesCellTexts = { ...currentCommonValuesData, ...cleanedTempData };
            tempCommonValuesCellTexts = {};
        } else {
            // 임시 저장소에 데이터가 없으면 현재 표의 모든 셀 내용을 수집
            commonValuesCellTexts = collectCommonValuesTableData();
        }
        
        // 매트릭스 하부 표 데이터 처리
        if (Object.keys(tempMatrixExtraTableData).length > 0) {
            // 임시 저장소와 현재 표 데이터를 병합
            const currentTableData = collectMatrixExtraTableData();
            matrixExtraTableData = { ...currentTableData, ...tempMatrixExtraTableData };
            tempMatrixExtraTableData = {};
        } else {
            // 임시 저장소에 데이터가 없으면 현재 표의 모든 셀 내용을 수집
            matrixExtraTableData = collectMatrixExtraTableData();
        }
        
        // 깊은 복사를 통해 현재 상태의 독립적인 복사본 생성
    const versionData = {
            coursesTab: {
                courses: Array.isArray(courses) ? JSON.parse(JSON.stringify(courses)) : [],
                initialCourses: Array.isArray(initialCourses) ? JSON.parse(JSON.stringify(initialCourses)) : []
            },
            matrixTab: {
                matrixData: typeof matrixData === 'object' ? JSON.parse(JSON.stringify(matrixData)) : {},
        matrixTitleText: localStorage.getItem('matrixTitleText') || '',
                matrixExtraTableData: typeof matrixExtraTableData === 'object' ? 
                    JSON.parse(JSON.stringify(matrixExtraTableData)) : {}
            },
            curriculumTab: {
                curriculumCellTexts: typeof curriculumCellTexts === 'object' ? 
                    JSON.parse(JSON.stringify(curriculumCellTexts)) : {},
                curriculumTitleText: localStorage.getItem('curriculumTitleText') || ''
            },
            commonValuesTab: {
                commonValuesCellTexts: typeof commonValuesCellTexts === 'object' ? 
                    JSON.parse(JSON.stringify(commonValuesCellTexts)) : {},
                commonValuesCopiedBlocks: typeof commonValuesCopiedBlocks === 'object' ? 
                    JSON.parse(JSON.stringify(commonValuesCopiedBlocks)) : {},
                commonValuesTitleText: localStorage.getItem('commonValuesTitleText') || ''
            },
            settings: {
                designSettings: typeof designSettings === 'object' ? 
                    JSON.parse(JSON.stringify(designSettings)) : {},
                changeHistory: Array.isArray(getCurrentDiffSummary()) ? 
                    getCurrentDiffSummary() : []
            },
            metadata: {
        description: versionDescription,
        saveDate: new Date().toISOString(),
                timestamp: Date.now()
            }
        };
        
        // 저장될 데이터 상태 로그
        
        // 버전 데이터 저장 (깊은 복사 적용)
        versions[versionName] = JSON.parse(JSON.stringify(versionData));
        
        // 로컬 스토리지에 저장 (용량 문제 방지를 위해 분할 저장)
        try {
    localStorage.setItem('uosVersions', JSON.stringify(versions));
        } catch (storageError) {
            
            // 용량이 너무 크면 분할 저장 시도
            try {
                // 현재 버전만 따로 저장
                const singleVersionData = {};
                singleVersionData[versionName] = versions[versionName];
                localStorage.setItem(`uosVersion_${versionName}`, JSON.stringify(singleVersionData));
                
                // 버전 목록만 저장
                const versionsList = Object.keys(versions);
                localStorage.setItem('uosVersionsList', JSON.stringify(versionsList));
                
                alert('버전 데이터가 커서 분할 저장되었습니다.');
            } catch (splitError) {
                alert('버전 데이터가 너무 커서 저장에 실패했습니다. 불필요한 버전을 삭제해주세요.');
                return;
            }
        }
    
    currentVersion = versionName;
    localStorage.setItem('uosCurrentVersion', currentVersion);
    
    // Firebase에 버전별로 개별 저장
    if (firebaseInitialized && isOnline) {
        try {
            // 새 버전 데이터를 Firebase에 개별 저장
            await saveDataToFirebase(`versions/${versionName}`, versionData);
            
            // 버전 목록 업데이트
            const versionList = Object.keys(versions);
            await saveDataToFirebase('versionList', versionList);
            
            // 현재 버전 정보 저장
            await saveDataToFirebase('currentVersion', currentVersion);
            
        } catch (error) {
            showToast('클라우드 저장에 실패했습니다. 로컬에만 저장되었습니다.');
        }
    }
        
        // UI 업데이트
        renderCourses();
        renderMatrix();
        renderCurriculumTable();
        // 셀 편집 중이 아닐 때만 테이블 렌더링
        if (!isCommonValuesCellEditing) {
            renderCommonValuesTable();
        }
        renderMatrixExtraTable();
        updateStats();
    updateCurrentVersionDisplay();
        renderVersionList();
        updateVersionNavigationButtons();
    
    showToast(`'${versionName}' 버전이 저장되었습니다.`);
        
    } catch (error) {
        alert('버전 저장 중 오류가 발생했습니다. 데이터가 너무 큽니다.');
        return;
    }
    
    closeVersionSaveModal();
}

// 전체 데이터를 현재 버전으로 저장 (임시 저장소에서 실제 저장소로 이동)
async function saveCurrentVersion() {
    // 임시 저장소의 데이터를 실제 저장소로 이동 (깊은 복사 적용)
    if (tempCourses.length > 0) {
        courses = JSON.parse(JSON.stringify(tempCourses));
        tempCourses = [];
    }
    
    if (Object.keys(tempMatrixData).length > 0) {
        
        // 매트릭스 제목 변경사항 처리
        if (tempMatrixData._titleChanged) {
            localStorage.setItem('matrixTitleText', tempMatrixData._newTitle);
            delete tempMatrixData._titleChanged;
            delete tempMatrixData._oldTitle;
            delete tempMatrixData._newTitle;
        }
        
        // tempMatrixData에서 제목 관련 속성들을 제외한 실제 matrixData만 추출
        const actualMatrixData = { ...tempMatrixData };
        delete actualMatrixData._titleChanged;
        delete actualMatrixData._oldTitle;
        delete actualMatrixData._newTitle;
        
        // --- 필터링 추가: courses에 없는 과목은 제외 ---
        const validCourseNames = new Set(courses.map(c => c.courseName));
        Object.keys(actualMatrixData).forEach(name => {
            if (!validCourseNames.has(name)) {
                delete actualMatrixData[name];
            }
        });
        
        matrixData = JSON.parse(JSON.stringify(actualMatrixData));
        tempMatrixData = {};
    } else {
        // tempMatrixData가 비어있으면 현재 matrixData를 그대로 유지
        // --- 필터링 추가: courses에 없는 과목은 제외 ---
        const validCourseNames = new Set(courses.map(c => c.courseName));
        Object.keys(matrixData).forEach(name => {
            if (!validCourseNames.has(name)) {
                delete matrixData[name];
            }
        });
    }
    
    if (Object.keys(tempCurriculumCellTexts).length > 0) {
        // 이수모형 제목 변경사항 처리
        if (tempCurriculumCellTexts._titleChanged) {
            localStorage.setItem('curriculumTitleText', tempCurriculumCellTexts._newTitle);
            delete tempCurriculumCellTexts._titleChanged;
            delete tempCurriculumCellTexts._oldTitle;
            delete tempCurriculumCellTexts._newTitle;
        }
        
        // 임시 저장소와 현재 표 데이터를 병합
        const currentCurriculumData = collectCurriculumTableData();
        curriculumCellTexts = { ...currentCurriculumData, ...tempCurriculumCellTexts };
        tempCurriculumCellTexts = {};
    } else {
        // 임시 저장소에 데이터가 없으면 현재 표의 모든 셀 내용을 수집
        curriculumCellTexts = collectCurriculumTableData();
    }
    
            if (Object.keys(tempCommonValuesCellTexts).length > 0) {
            
            // 공통가치대응 제목 변경사항 처리
            if (tempCommonValuesCellTexts._titleChanged) {
                localStorage.setItem('commonValuesTitleText', tempCommonValuesCellTexts._newTitle);
                delete tempCommonValuesCellTexts._titleChanged;
                delete tempCommonValuesCellTexts._oldTitle;
                delete tempCommonValuesCellTexts._newTitle;
            }
            
            // 임시 저장소와 현재 표 데이터를 병합 (2차원 구조만 유지)
            const currentCommonValuesData = collectCommonValuesTableData();
            
            // 1차원 key 제거하고 2차원 구조만 유지
            const cleanedTempData = {};
            Object.entries(tempCommonValuesCellTexts).forEach(([key, value]) => {
                if (key.includes('-cell-') && key.includes('-value')) {
                    // 1차원 key는 무시 (예: "commonValues-cell-설계-value1")
                } else if (typeof value === 'object' && value !== null) {
                    // 2차원 구조는 유지 (예: {"설계": {"value1": "a"}})
                    cleanedTempData[key] = value;
                }
            });
            
            commonValuesCellTexts = { ...currentCommonValuesData, ...cleanedTempData };
            tempCommonValuesCellTexts = {};
        } else {
            // 임시 저장소에 데이터가 없으면 현재 표의 모든 셀 내용을 수집
            commonValuesCellTexts = collectCommonValuesTableData();
        }
    
    // 매트릭스 하부 안내 표 데이터 처리
    const collectedMatrixExtraData = collectMatrixExtraTableData();
    
    if (Object.keys(tempMatrixExtraTableData).length > 0) {
        // 임시 저장소와 병합
        const mergedMatrixExtraData = { ...collectedMatrixExtraData, ...tempMatrixExtraTableData };
        matrixExtraTableData = mergedMatrixExtraData;
        tempMatrixExtraTableData = {};
    } else {
        // 임시 저장소에 데이터가 없으면 수집한 데이터 사용
        matrixExtraTableData = collectedMatrixExtraData;
    }
    
    
    // 깊은 복사를 통해 현재 상태의 독립적인 복사본 생성
    const versionData = {
        // 1. 교과목 관리 탭
        coursesTab: {
            courses: Array.isArray(courses) ? JSON.parse(JSON.stringify(courses)) : [],
            initialCourses: Array.isArray(initialCourses) ? JSON.parse(JSON.stringify(initialCourses)) : []
        },
        
        // 2. 수행평가 매트릭스 탭
        matrixTab: {
            matrixData: typeof matrixData === 'object' ? JSON.parse(JSON.stringify(matrixData)) : {},
            matrixTitleText: localStorage.getItem('matrixTitleText') || '',
            matrixExtraTableData: typeof matrixExtraTableData === 'object' ? 
                JSON.parse(JSON.stringify(matrixExtraTableData)) : {}
        },
        
        // 3. 이수모형 탭
        curriculumTab: {
            curriculumCellTexts: typeof curriculumCellTexts === 'object' ? 
                JSON.parse(JSON.stringify(curriculumCellTexts)) : {},
            curriculumTitleText: localStorage.getItem('curriculumTitleText') || ''
        },
        
        // 4. 공통가치대응 탭
        commonValuesTab: {
            commonValuesCellTexts: typeof commonValuesCellTexts === 'object' ? 
                JSON.parse(JSON.stringify(commonValuesCellTexts)) : {},
            commonValuesCopiedBlocks: typeof commonValuesCopiedBlocks === 'object' ? 
                JSON.parse(JSON.stringify(commonValuesCopiedBlocks)) : {},
            commonValuesTitleText: localStorage.getItem('commonValuesTitleText') || ''
        },
        
        // 공통 설정
        settings: {
            designSettings: typeof designSettings === 'object' ? 
                JSON.parse(JSON.stringify(designSettings)) : {},
            changeHistory: Array.isArray(getCurrentDiffSummary()) ? 
                getCurrentDiffSummary() : []
        },
        
        // 메타데이터
        metadata: {
            saveDate: new Date().toISOString(),
            timestamp: Date.now()
        }
    };
    
    // 버전 데이터 저장 (깊은 복사 적용)
    versions[currentVersion] = JSON.parse(JSON.stringify(versionData));
    
    // 로컬 스토리지에 저장 (용량 문제 방지를 위해 분할 저장)
    try {
        localStorage.setItem('uosVersions', JSON.stringify(versions));
    } catch (storageError) {
        
        // 용량이 너무 크면 분할 저장 시도
        try {
            // 현재 버전만 따로 저장
            const singleVersionData = {};
            singleVersionData[currentVersion] = versions[currentVersion];
            localStorage.setItem(`uosVersion_${currentVersion}`, JSON.stringify(singleVersionData));
            
            // 버전 목록만 저장
            const versionsList = Object.keys(versions);
            localStorage.setItem('uosVersionsList', JSON.stringify(versionsList));
            
            alert('버전 데이터가 커서 분할 저장되었습니다.');
        } catch (splitError) {
            alert('버전 데이터가 너무 커서 저장에 실패했습니다. 불필요한 버전을 삭제해주세요.');
            return;
        }
    }
    
    localStorage.setItem('uosCurrentVersion', currentVersion);
    
    // Firebase에 버전별로 개별 저장
    if (firebaseInitialized && isOnline) {
        try {
            // 현재 버전 데이터를 Firebase에 개별 저장
            await saveDataToFirebase(`versions/${currentVersion}`, versionData);
            
            // 버전 목록 업데이트
            const versionList = Object.keys(versions);
            await saveDataToFirebase('versionList', versionList);
            
            // 현재 버전 정보 저장
            await saveDataToFirebase('currentVersion', currentVersion);
            
        } catch (error) {
            showToast('클라우드 저장에 실패했습니다. 로컬에만 저장되었습니다.');
        }
    }
    
    // 테이블들 다시 렌더링
    renderCourses();
    renderMatrix();
    renderCurriculumTable();
    // 셀 편집 중이 아닐 때만 테이블 렌더링
    if (!isCommonValuesCellEditing) {
        renderCommonValuesTable();
    }
    renderMatrixExtraTable();
    updateStats();
    
    updateVersionNavigationButtons();
    showToast('현재 버전이 저장되었습니다.');
}

// 버전 복원 (임시 저장소 초기화 포함)
function restoreVersion(versionName) {
    if (!confirm(`'${versionName}' 버전을 복원하시겠습니까? 현재 데이터가 덮어써집니다.`)) {
        return;
    }
    
    // 원본 데이터를 수정하지 않기 위해 깊은 복사
    const versionData = JSON.parse(JSON.stringify(versions[versionName]));
    if (!versionData) {
        alert('버전 데이터를 찾을 수 없습니다.');
        return;
    }
    
    try {
        // 버전 복원 플래그 설정
        window.isRestoringVersion = true;
        
        // 임시 저장소 초기화
        clearTempStorage();
        
        // 1. 교과목 관리 탭 데이터 복원 (깊은 복사 적용)
        if (versionData.coursesTab) {
            courses = Array.isArray(versionData.coursesTab.courses) ? 
                JSON.parse(JSON.stringify(versionData.coursesTab.courses)) : [];
                
            initialCourses = Array.isArray(versionData.coursesTab.initialCourses) ? 
                JSON.parse(JSON.stringify(versionData.coursesTab.initialCourses)) : 
                JSON.parse(JSON.stringify(courses));
                
            ensureCourseIds(courses);
        ensureCourseIds(initialCourses);
        }
        
        // 2. 수행평가 매트릭스 탭 데이터 복원 (깊은 복사 적용)
        if (versionData.matrixTab) {
            matrixData = versionData.matrixTab.matrixData ? 
                JSON.parse(JSON.stringify(versionData.matrixTab.matrixData)) : {};
                
            if (versionData.matrixTab.matrixTitleText) {
                localStorage.setItem('matrixTitleText', versionData.matrixTab.matrixTitleText);
            }
            
            // matrixExtraTableData 복원 (null 체크 추가)
            if (versionData.matrixTab.matrixExtraTableData) {
                matrixExtraTableData = JSON.parse(JSON.stringify(versionData.matrixTab.matrixExtraTableData));
        } else {
                matrixExtraTableData = {};
            }
        }
        
        // 3. 이수모형 탭 데이터 복원 (깊은 복사 적용)
        if (versionData.curriculumTab) {
            curriculumCellTexts = versionData.curriculumTab.curriculumCellTexts ? 
                JSON.parse(JSON.stringify(versionData.curriculumTab.curriculumCellTexts)) : {};
                
                
            if (versionData.curriculumTab.curriculumTitleText) {
                localStorage.setItem('curriculumTitleText', versionData.curriculumTab.curriculumTitleText);
            }
        }
        
        // 4. 공통가치대응 탭 데이터 복원 (깊은 복사 적용)



        if (versionData.commonValuesTab) {
            let raw = versionData.commonValuesTab.commonValuesCellTexts
                ? JSON.parse(JSON.stringify(versionData.commonValuesTab.commonValuesCellTexts))
                : {};
        
            // 변환: 1차원 key → 2차원 구조
            const converted = {};
            Object.entries(raw).forEach(([key, value]) => {
                const match = key.match(/^commonValues-cell-([^\\-]+)-value([123])$/);
                if (match) {
                    const subject = match[1];
                    const vkey = 'value' + match[2];
                    if (!converted[subject]) converted[subject] = {};
                    converted[subject][vkey] = value;
                }
            });
            commonValuesCellTexts = Object.keys(converted).length > 0 ? converted : raw;
            
            // 공통가치대응 노드 그룹 속성 데이터 복원
            if (versionData.commonValuesTab.commonValuesCopiedBlocks) {
                commonValuesCopiedBlocks = JSON.parse(JSON.stringify(versionData.commonValuesTab.commonValuesCopiedBlocks));
            } else {
                // 기존 구조 호환성을 위해 빈 객체로 초기화
                commonValuesCopiedBlocks = {};
            }
        
            if (versionData.commonValuesTab.commonValuesTitleText) {
                localStorage.setItem('commonValuesTitleText', versionData.commonValuesTab.commonValuesTitleText);
            }
        }
        
        // 공통 설정 복원 (깊은 복사 적용)
        if (versionData.settings) {
            designSettings = versionData.settings.designSettings ? 
                JSON.parse(JSON.stringify(versionData.settings.designSettings)) : {};
            // 변경이력 복원 추가
            changeHistory = versionData.settings.changeHistory || [];
        } else {
            // 기존 구조 호환성
            designSettings = versionData.designSettings || designSettings;
            // 변경이력 복원 추가 (레거시)
            changeHistory = versionData.changeHistory || [];
        }
        
        // 현재 버전 업데이트
        currentVersion = versionName;
        localStorage.setItem('uosCurrentVersion', currentVersion);
        
        // 모든 탭 렌더링
        renderCourses();
        renderMatrix();
        renderCurriculumTable();
        renderMatrixExtraTable();
        
        // 공통가치대응 테이블 강제 렌더링 (복원 시에는 편집 상태 무시)
        
        window.isRestoringVersion = true;
        const originalIsCommonValuesCellEditing = isCommonValuesCellEditing;
        isCommonValuesCellEditing = false;
        renderCommonValuesTable();
        isCommonValuesCellEditing = originalIsCommonValuesCellEditing;
        window.isRestoringVersion = false;
        updateStats();
        drawChart();
        drawSubjectTypeChart();
        renderChangeHistoryPanel();
        updateAllVersionLabels();
        updateCurrentVersionDisplay();
        
        // 복원된 데이터 요약 정보 생성
        let courseCount = Array.isArray(courses) ? courses.length : 0;
        let matrixDataCount = typeof matrixData === 'object' ? Object.keys(matrixData).length : 0;
        let curriculumCellCount = typeof curriculumCellTexts === 'object' ? Object.keys(curriculumCellTexts).length : 0;
        let commonValuesCount = typeof commonValuesCellTexts === 'object' ? Object.keys(commonValuesCellTexts).length : 0;
        let matrixExtraCount = typeof matrixExtraTableData === 'object' ? Object.keys(matrixExtraTableData).length : 0;
        
        // 복원 결과를 더 명확하게 표시
        const restoreMessage = `
            '${versionName}' 버전이 복원되었습니다.
            
            복원된 데이터:
            - 교과목: ${courseCount}개
            - 매트릭스 데이터: ${matrixDataCount}개
            - 이수모형 셀: ${curriculumCellCount}개
            - 공통가치 셀: ${commonValuesCount}개
            - 매트릭스 추가 셀: ${matrixExtraCount}개
        `;
        
        showToast(restoreMessage);
        
        // 복원된 버전을 현재 탭으로 이동
        const lastTab = localStorage.getItem('uosLastTab') || 'courses';
        showTab(lastTab);
        
        // 복원된 탭에 시각적 피드백 추가
        const activeTab = document.querySelector('.tab-button.active');
        if (activeTab) {
            // 하이라이트 효과 추가
            activeTab.style.animation = 'restoreHighlight 2s ease-in-out';
            setTimeout(() => {
                activeTab.style.animation = '';
            }, 2000);
        }
        
        // 버전 네비게이션 버튼 상태 업데이트
        updateVersionNavigationButtons();
        
        // 버전 관리 모달이 열려있다면 닫기
        const versionManagerModal = document.getElementById('versionManagerModal');
        if (versionManagerModal && versionManagerModal.style.display === 'block') {
            closeVersionManager();
        }
        
        // 복원 완료 후 콘솔에 로그 출력
    } catch (e) {
        alert('버전 복원 중 오류가 발생했습니다.');
    }
}

// 버전 삭제
async function deleteVersion(versionName) {
    if (!confirm(`'${versionName}' 버전을 삭제하시겠습니까?`)) {
        return;
    }
    
    delete versions[versionName];
    localStorage.setItem('uosVersions', JSON.stringify(versions));
    
    // Firebase에서 개별 버전 삭제
    if (firebaseInitialized && isOnline) {
        try {
            // 개별 버전 데이터 삭제
            await db.ref(`versions/${versionName}`).remove();
            
            // 버전 목록 업데이트
            const versionList = Object.keys(versions);
            await saveDataToFirebase('versionList', versionList);
            
        } catch (error) {
            showToast('클라우드에서 삭제에 실패했습니다. 로컬에서만 삭제되었습니다.');
        }
    }
    
    // 현재 버전이 삭제된 경우 기본 버전으로 변경
    if (currentVersion === versionName) {
        currentVersion = '기본';
        localStorage.setItem('uosCurrentVersion', currentVersion);
        
        // Firebase에서도 현재 버전 업데이트
        if (firebaseInitialized && isOnline) {
            try {
                await saveDataToFirebase('currentVersion', currentVersion);
            } catch (error) {
            }
        }
        
        updateCurrentVersionDisplay();
    }
    
    renderVersionList();
    updateVersionNavigationButtons();
    showToast(`'${versionName}' 버전이 삭제되었습니다.`);
}



// 버전명 라벨 동기화 함수
function updateAllVersionLabels() {
    const version = currentVersion || '기본';
    const matrixLabel = document.getElementById('matrixVersionText');
    const curriculumLabel = document.getElementById('curriculumVersionText');
    const commonValuesLabel = document.getElementById('commonValuesVersionText');
    if (matrixLabel) matrixLabel.textContent = version;
    if (curriculumLabel) curriculumLabel.textContent = version;
    if (commonValuesLabel) commonValuesLabel.textContent = version;
}

// 복원 후 새로고침 시 restoredVersionChangeHistory를 null로 초기화
window.addEventListener('DOMContentLoaded', function() {
    const stored = localStorage.getItem('restoredVersionChangeHistory');
    if (stored) {
        try {
            restoredVersionChangeHistory = JSON.parse(stored);
        } catch(e) {
            restoredVersionChangeHistory = null;
        }
        // 한 번 읽으면 바로 삭제(1회성)
        localStorage.removeItem('restoredVersionChangeHistory');
    } else {
        restoredVersionChangeHistory = null;
    }
    
    // 창 크기 변경 시 차트 리사이즈
    window.addEventListener('resize', function() {
        setTimeout(() => {
            drawChart();
            drawSubjectTypeChart();
        }, 100);
    });
    
    // 초기 차트 그리기
    setTimeout(() => {
        drawChart();
        drawSubjectTypeChart();
    }, 100);
    
    // 버전 라벨 업데이트
    setTimeout(() => {
        updateAllVersionLabels();
    }, 200);
});

// 변경된 교과목 id Set 반환 함수
function getChangedCourseIds() {
    const diff = getCurrentDiffSummary();
    const ids = new Set();
    diff.forEach(entry => {
        if (entry.course && entry.course.id) {
            ids.add(entry.course.id);
        }
    });
    return ids;
}

// 고유 id 생성 함수
function generateUniqueId() {
    return 'c' + Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}

// courses 배열의 모든 교과목에 id가 없으면 자동 부여
function ensureCourseIds(arr) {
    arr.forEach(course => {
        if (!course.id) course.id = generateUniqueId();
    });
}

// 페이지 로드 시 모든 courses/initialCourses/버전 courses에 id 보장
window.addEventListener('DOMContentLoaded', function() {
    if (typeof ensureCourseIds === 'function') {
        if (typeof courses !== 'undefined') ensureCourseIds(courses);
        if (typeof initialCourses !== 'undefined') ensureCourseIds(initialCourses);
        if (typeof versions !== 'undefined') {
            Object.values(versions).forEach(v => {
                if (v.courses) ensureCourseIds(v.courses);
            });
        }
    }
});

// 이동된 교과목 정보를 가져오는 함수
function getMovedCoursesForGhost() {
    const movedCourses = [];
    
    // 현재 교과목들과 초기 교과목들을 비교하여 이동된 것들을 찾기 (id 기준)
    courses.forEach(currentCourse => {
        const initialCourse = initialCourses.find(ic => ic.id === currentCourse.id);
        if (initialCourse && initialCourse.yearSemester !== currentCourse.yearSemester) {
            movedCourses.push({
                initialCourse: initialCourse,
                currentCourse: currentCourse
            });
        }
    });
    
    return movedCourses;
}

// 화살표 초기화 함수
function clearMoveArrows() {
    const svgContainer = document.getElementById('moveArrowsSvg');
    if (svgContainer) {
        svgContainer.innerHTML = '';
    }
}

// 이동된 교과목 화살표 그리기 함수 (최적화된 버전)
function drawMoveArrows(movedCoursesForGhost) {
    const curriculumTable = document.querySelector('.curriculum-table');
    
    if (!curriculumTable || movedCoursesForGhost.length === 0) {
        return;
    }
    
    // SVG 컨테이너 생성 또는 가져오기
    let svgContainer = document.getElementById('moveArrowsSvg');
    if (!svgContainer) {
        svgContainer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svgContainer.id = 'moveArrowsSvg';
        svgContainer.style.position = 'absolute';
        svgContainer.style.top = '0';
        svgContainer.style.left = '0';
        svgContainer.style.width = '100%';
        svgContainer.style.height = '100%';
        svgContainer.style.pointerEvents = 'none';
        svgContainer.style.zIndex = '10';
        
        // 이수모형 컨테이너에 상대 위치 설정
        const curriculumContent = document.getElementById('curriculum');
        if (curriculumContent) {
            const tableContainer = curriculumContent.querySelector('.table-container');
            if (tableContainer) {
                tableContainer.style.position = 'relative';
                tableContainer.appendChild(svgContainer);
            }
        }
    } else {
        // 기존 화살표 제거
        svgContainer.innerHTML = '';
    }
    
    movedCoursesForGhost.forEach((moveInfo, index) => {
        // 고스트 블럭 위치는 순전히 초기 상태로만 계산
        const originalCellId = getCurriculumCellId(moveInfo.initialCourse);
        const newCellId = getCurriculumCellId(moveInfo.currentCourse);
        
        // 실제로 위치가 다른 경우에만 화살표 그리기
        if (originalCellId !== newCellId) {
            const originalCell = document.getElementById(originalCellId);
            const newCell = document.getElementById(newCellId);
            
            if (originalCell && newCell) {
                drawArrowBetweenCells(svgContainer, originalCell, newCell, index, moveInfo);
            }
        }
    });
}

// 두 교과목 블럭 사이에 화살표 그리기 (최적화된 버전)
function drawArrowBetweenCells(svgContainer, fromCell, toCell, index, moveInfo) {
    const tableContainer = document.querySelector('.curriculum-table').closest('.table-container');
    if (!tableContainer) {
        return;
    }
    
    // 고스트 블럭과 현재 교과목 블럭 찾기
    const fromGhostBlock = fromCell.querySelector('.course-block.ghost');
    const targetCourseName = moveInfo.currentCourse.courseName;
    const allBlocksInCell = toCell.querySelectorAll('.course-block:not(.ghost)');
    let toCurrentBlock = null;
    
    // courseName으로 정확한 블럭 찾기
    allBlocksInCell.forEach(block => {
        if (block.dataset.courseName === targetCourseName) {
            toCurrentBlock = block;
        }
    });
    
    if (!fromGhostBlock || !toCurrentBlock) {
        return;
    }
    
    const containerRect = tableContainer.getBoundingClientRect();
    const fromRect = fromGhostBlock.getBoundingClientRect();
    const toRect = toCurrentBlock.getBoundingClientRect();
    
    // 각 교과목 블럭의 중심 좌표
    const fromCenterX = fromRect.left + fromRect.width / 2;
    const fromCenterY = fromRect.top + fromRect.height / 2;
    const toCenterX = toRect.left + toRect.width / 2;
    const toCenterY = toRect.top + toRect.height / 2;
    
    // 화살표 시작점은 고스트 블럭 중심, 끝점은 현재 블럭 중심
    const fromEdge = getRectEdgePoint(fromRect, toCenterX, toCenterY);
    const toEdge = getRectEdgePoint(toRect, fromCenterX, fromCenterY);
    
    // 기본적으로는 고스트 블럭 중심에서 현재 블럭 테두리로 연결
    let fromX = fromCenterX - containerRect.left;
    let fromY = fromCenterY - containerRect.top;
    let toX = toEdge.x - containerRect.left;
    let toY = toEdge.y - containerRect.top;
    
    // 다른 블럭과의 겹침을 확인하고 필요시 경로 조정
    const allBlocks = document.querySelectorAll('.course-block:not(.ghost)');
    let needsPathAdjustment = false;
    
    allBlocks.forEach(block => {
        // 현재 대상 블럭과 고스트 블럭은 제외
        if (block === toCurrentBlock || block === fromGhostBlock) return;
        
        const blockRect = block.getBoundingClientRect();
        const blockCenterX = blockRect.left + blockRect.width / 2 - containerRect.left;
        const blockCenterY = blockRect.top + blockRect.height / 2 - containerRect.top;
        
        // 화살표 경로가 다른 블럭과 겹치는지 확인
        const distance = Math.sqrt((blockCenterX - (fromX + toX) / 2) ** 2 + (blockCenterY - (fromY + toY) / 2) ** 2);
        const blockRadius = Math.max(blockRect.width, blockRect.height) / 2;
        
        if (distance < blockRadius + 20) { // 20px 여유 공간
            needsPathAdjustment = true;
        }
    });
    
    // 겹침이 감지되면 테두리 연결점 사용
    if (needsPathAdjustment) {
        fromX = fromEdge.x - containerRect.left;
        fromY = fromEdge.y - containerRect.top;
        toX = toEdge.x - containerRect.left;
        toY = toEdge.y - containerRect.top;
    }
    
    // 연결점이 유효한지 확인
    if (isNaN(fromX) || isNaN(fromY) || isNaN(toX) || isNaN(toY)) {
        return;
    }
    
    const deltaX = toX - fromX;
    const deltaY = toY - fromY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const curveHeight = Math.min(distance * 0.3, 100);
    const midX = (fromX + toX) / 2;
    const midY = (fromY + toY) / 2 - curveHeight;

    // 패스(곡선) 생성
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const pathData = `M ${fromX} ${fromY} Q ${midX} ${midY} ${toX} ${toY}`;
    path.setAttribute('d', pathData);
    path.setAttribute('stroke', '#bdbdbd');
    path.setAttribute('stroke-width', '1.2');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    path.setAttribute('fill', 'none');
    path.setAttribute('opacity', '0.85');
    path.setAttribute('stroke-dasharray', '5,4');
    path.style.filter = 'drop-shadow(0 2px 6px rgba(189,189,189,0.13))';
    
    // 애니메이션(점선 이동 효과)
    const animate = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
    animate.setAttribute('attributeName', 'stroke-dashoffset');
    animate.setAttribute('values', '0;-9');
    animate.setAttribute('dur', '1.6s');
    animate.setAttribute('repeatCount', 'indefinite');
    path.appendChild(animate);
    
    svgContainer.appendChild(path);

    // 화살표 머리(삼각형)
    const arrowSize = 8;
    const angle = Math.atan2(toY - fromY, toX - fromX);
    
    // 화살표 머리를 블럭 테두리에 정확히 위치
    const arrowX = toEdge.x - containerRect.left;
    const arrowY = toEdge.y - containerRect.top;
    
    const x1 = arrowX - arrowSize * Math.cos(angle - Math.PI / 6);
    const y1 = arrowY - arrowSize * Math.sin(angle - Math.PI / 6);
    const x2 = arrowX - arrowSize * Math.cos(angle + Math.PI / 6);
    const y2 = arrowY - arrowSize * Math.sin(angle + Math.PI / 6);
    
    const arrowHead = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    arrowHead.setAttribute('points', `${arrowX},${arrowY} ${x1},${y1} ${x2},${y2}`);
    arrowHead.setAttribute('fill', '#bdbdbd');
    arrowHead.setAttribute('opacity', '0.95');
    arrowHead.style.filter = 'drop-shadow(0 1px 2px #bdbdbdaa)';
    
    svgContainer.appendChild(arrowHead);
}

// 윈도우 리사이즈 시 화살표 다시 그리기
window.addEventListener('resize', function() {
    const curriculumTab = document.getElementById('curriculum');
    if (curriculumTab && curriculumTab.style.display !== 'none') {
        setTimeout(() => {
            renderCurriculumTable();
        }, 200);
    }
});

function getRectEdgePoint(rect, targetX, targetY) {
    // rect: getBoundingClientRect() 결과, targetX/Y: 연결하려는 반대편 중심
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = targetX - cx;
    const dy = targetY - cy;
    
    // 사각형 반쪽 크기
    const w = rect.width / 2;
    const h = rect.height / 2;
    
    // 방향 벡터 정규화
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance === 0) {
        // 목표점이 중심과 같은 경우, 기본 방향 사용
        return { x: rect.left + rect.width, y: cy };
    }
    
    const normalizedDx = dx / distance;
    const normalizedDy = dy / distance;
    
    // 각 축에서 테두리까지의 거리 계산
    const tx = Math.abs(w / normalizedDx);
    const ty = Math.abs(h / normalizedDy);
    
    // 더 작은 거리(먼저 만나는 테두리) 선택
    const t = Math.min(tx, ty);
    
    // 중심에서 정규화된 방향으로 t만큼 이동
    const edgeX = cx + normalizedDx * t;
    const edgeY = cy + normalizedDy * t;
    
    // 결과가 사각형 범위 내에 있는지 확인하고 조정
    const resultX = Math.max(rect.left, Math.min(rect.right, edgeX));
    const resultY = Math.max(rect.top, Math.min(rect.bottom, edgeY));
    
    return {
        x: resultX,
        y: resultY
    };
}

// 버전 관리/불러오기 모달 표시
function showVersionManager() {
    const modal = document.getElementById('versionManagerModal');
    if (modal) {
        modal.style.display = 'block';
        renderVersionList();
    }
}

// 이전 버전으로 이동
function previousVersion() {
    // 버전명을 저장 시각 기준 오름차순(과거→최신)으로 정렬
    const versionNames = Object.entries(versions)
        .map(([name, data]) => {
            const metadata = data.metadata || {};
            const timestamp = metadata.timestamp || new Date(metadata.saveDate || 0).getTime();
            return { name, timestamp };
        })
        .sort((a, b) => a.timestamp - b.timestamp)
        .map(v => v.name);
    const currentIndex = versionNames.indexOf(currentVersion);
    if (currentIndex > 0) {
        const previousVersionName = versionNames[currentIndex - 1];
        restoreVersion(previousVersionName);
        showToast(`이전 버전 '${previousVersionName}'으로 이동했습니다.`);
    } else {
        showToast('첫 번째 버전입니다.');
    }
}
// 다음 버전으로 이동
function nextVersion() {
    // 버전명을 저장 시각 기준 오름차순(과거→최신)으로 정렬
    const versionNames = Object.entries(versions)
        .map(([name, data]) => {
            const metadata = data.metadata || {};
            const timestamp = metadata.timestamp || new Date(metadata.saveDate || 0).getTime();
            return { name, timestamp };
        })
        .sort((a, b) => a.timestamp - b.timestamp)
        .map(v => v.name);
    const currentIndex = versionNames.indexOf(currentVersion);
    if (currentIndex < versionNames.length - 1) {
        const nextVersionName = versionNames[currentIndex + 1];
        restoreVersion(nextVersionName);
        showToast(`다음 버전 '${nextVersionName}'으로 이동했습니다.`);
    } else {
        showToast('마지막 버전입니다.');
    }
}

// 버전 네비게이션 버튼 상태 업데이트
function updateVersionNavigationButtons() {
    // 버전명을 저장 시각 기준 오름차순(과거→최신)으로 정렬
    const versionNames = Object.entries(versions)
        .map(([name, data]) => {
            const metadata = data.metadata || {};
            const timestamp = metadata.timestamp || new Date(metadata.saveDate || 0).getTime();
            return { name, timestamp };
        })
        .sort((a, b) => a.timestamp - b.timestamp)
        .map(v => v.name);

    const currentIndex = versionNames.indexOf(currentVersion);

    const prevBtn = document.querySelector('.version-nav-btn[onclick=\"previousVersion()\"]');
    const nextBtn = document.querySelector('.version-nav-btn[onclick=\"nextVersion()\"]');

    if (prevBtn) {
        prevBtn.disabled = currentIndex <= 0;
    }

    if (nextBtn) {
        nextBtn.disabled = currentIndex >= versionNames.length - 1;
    }
}

// 버전 목록 렌더링
function renderVersionList() {
    const versionList = document.getElementById('versionList');
    if (!versionList) return;
    
    versionList.innerHTML = '';
    
    // 버전을 날짜순으로 정렬 (최신순)
    const versionEntries = Object.entries(versions).map(([name, data]) => {
        const metadata = data.metadata || {};
        const timestamp = metadata.timestamp || new Date(metadata.saveDate || 0).getTime();
        return { name, data, timestamp };
    }).sort((a, b) => b.timestamp - a.timestamp);
    
    if (versionEntries.length === 0) {
        versionList.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 20px;">저장된 버전이 없습니다.</p>';
        return;
    }
    
    // 현재 버전 정보 표시
    const currentVersionInfo = document.createElement('div');
    currentVersionInfo.className = 'current-version-info';
    currentVersionInfo.innerHTML = `
        <div class="alert alert-info">
            <strong>현재 버전:</strong> ${currentVersion}
        </div>
    `;
    versionList.appendChild(currentVersionInfo);
    
    versionEntries.forEach(({ name, data }) => {
        const metadata = data.metadata || {};
        const saveDate = new Date(metadata.saveDate || metadata.timestamp);
        
        // 날짜/시간 포맷팅
        const dateString = saveDate.toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
        
        // 데이터 요약 정보 생성
        let courseCount = 0;
        let matrixDataCount = 0;
        let curriculumCellCount = 0;
        let commonValuesCount = 0;
        
        if (data.coursesTab && Array.isArray(data.coursesTab.courses)) {
            courseCount = data.coursesTab.courses.length;
        }
        
        if (data.matrixTab && data.matrixTab.matrixData) {
            matrixDataCount = Object.keys(data.matrixTab.matrixData).length;
        }
        
        if (data.curriculumTab && data.curriculumTab.curriculumCellTexts) {
            curriculumCellCount = Object.keys(data.curriculumTab.curriculumCellTexts).length;
        }
        
        if (data.commonValuesTab && data.commonValuesTab.commonValuesCellTexts) {
            commonValuesCount = Object.keys(data.commonValuesTab.commonValuesCellTexts).length;
        }
        
        const versionItem = document.createElement('div');
        versionItem.className = 'version-item';
        if (name === currentVersion) {
            versionItem.classList.add('current-version');
        }
        
        versionItem.innerHTML = `
            <div class="version-item-info">
                <div class="version-item-name">
                    ${name} ${name === currentVersion ? '<span class="badge bg-success">현재</span>' : ''}
                </div>
                ${metadata.description ? `<div class="version-item-description">${metadata.description}</div>` : ''}
                <div class="version-item-date">${dateString}</div>
                <div class="version-item-summary">
                    <small>
                        교과목 ${courseCount}개 | 
                        매트릭스 데이터 ${matrixDataCount}개 | 
                        이수모형 셀 ${curriculumCellCount}개 | 
                        공통가치 셀 ${commonValuesCount}개
                    </small>
                </div>
            </div>
            <div class="version-item-actions">
                <button class="btn btn-sm btn-primary" onclick="restoreVersion('${name}')" 
                    ${name === currentVersion ? 'disabled' : ''}>복원</button>
                <button class="btn btn-sm btn-secondary" onclick="deleteVersion('${name}')"
                    ${name === '기본' ? 'disabled' : ''}>삭제</button>
            </div>
        `;
        
        versionList.appendChild(versionItem);
    });
}

// 버전 관리 모달 닫기
function closeVersionManager() {
    const modal = document.getElementById('versionManagerModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// 공통가치대응 테이블 렌더링 (교과목 블럭 포함, 실제 데이터 연동)
function renderCommonValuesTable() {
    // 셀 편집 중일 때는 렌더링하지 않음 (복원 시에는 제외)
    if (isCommonValuesCellEditing && !window.isRestoringVersion) {
        return;
    }
    
    // 편집 중인 셀이 있는지 확인 (복원 시에는 제외)
    const editingCells = document.querySelectorAll('#commonValuesTable .editing-cell');
    if (editingCells.length > 0 && !window.isRestoringVersion) {
        return;
    }
    
    // 공통가치대응 탭이 활성화되어 있지 않으면 렌더링하지 않음 (복원 시에는 제외)
    const commonValuesTab = document.getElementById('commonValuesTab');
    if (commonValuesTab && !commonValuesTab.classList.contains('active') && !window.isRestoringVersion) {
        return;
    }
    
    // 공통가치대응 제목 업데이트
    const titleElement = document.getElementById('commonValuesTitle');
    if (titleElement) {
        const savedTitle = localStorage.getItem('commonValuesTitleText');
        if (savedTitle) {
            titleElement.textContent = savedTitle;
        } else {
            titleElement.textContent = '공통가치대응';
        }
    }
    
    // 과목분류별 행 정의 (미분류 제외)
    const subjectTypes = [
        '설계', '디지털', '역사', '이론', '도시', '사회', '기술', '실무', '비교과'
    ];

    subjectTypes.forEach(subjectType => {
        // 전공필수 (교과목 블럭)
        const tdRequired = document.getElementById(`commonValues-cell-${subjectType}-필수`);
        if (tdRequired) {
            tdRequired.innerHTML = '';
            const requiredCourses = courses.filter(c => c.subjectType === subjectType && c.isRequired === '필수');
            const wrap = document.createElement('div');
            wrap.className = 'block-wrap';
            requiredCourses.forEach(course => {
                const block = createCourseBlock(course, false, false);
                wrap.appendChild(block);
            });
            tdRequired.appendChild(wrap);
            tdRequired.addEventListener('dragover', handleCommonValuesDragOver);
            tdRequired.addEventListener('drop', handleCommonValuesDrop);
        }

        // 전공필수 학점
        const tdRequiredCredit = document.getElementById(`commonValues-cell-${subjectType}-필수-학점`);
        if (tdRequiredCredit) {
            const requiredCourses = courses.filter(c => c.subjectType === subjectType && c.isRequired === '필수');
            tdRequiredCredit.textContent = requiredCourses.reduce((sum, c) => sum + (c.credits || 0), 0);
        }

        // 전공선택 (교과목 블럭)
        const tdElective = document.getElementById(`commonValues-cell-${subjectType}-선택`);
        if (tdElective) {
            tdElective.innerHTML = '';
            const electiveCourses = courses.filter(c => c.subjectType === subjectType && c.isRequired === '선택');
            const wrap = document.createElement('div');
            wrap.className = 'block-wrap';
            electiveCourses.forEach(course => {
                const block = createCourseBlock(course, false, false);
                wrap.appendChild(block);
            });
            tdElective.appendChild(wrap);
            tdElective.addEventListener('dragover', handleCommonValuesDragOver);
            tdElective.addEventListener('drop', handleCommonValuesDrop);
        }
        
        // 전공선택 학점
        const tdElectiveCredit = document.getElementById(`commonValues-cell-${subjectType}-선택-학점`);
        if (tdElectiveCredit) {
            const electiveCourses = courses.filter(c => c.subjectType === subjectType && c.isRequired === '선택');
            tdElectiveCredit.textContent = electiveCourses.reduce((sum, c) => sum + (c.credits || 0), 0);
        }

        // 공통가치대응I, II, III (여러 줄 표시 지원)
        const tdValue1 = document.getElementById(`commonValues-cell-${subjectType}-value1`);
        if (tdValue1) {
            let wrap = tdValue1.querySelector('.block-wrap');
            if (!wrap) {
                wrap = document.createElement('div');
                wrap.className = 'block-wrap';
                tdValue1.appendChild(wrap);
            }
            
            // 셀이 편집 중이면 건드리지 않음
            if (!tdValue1.classList.contains('editing-cell')) {
                wrap.innerHTML = '';
                
                // [수정] 복사된 블럭 정보로 렌더링
                const hasBlocks = commonValuesCopiedBlocks[subjectType] && 
                                Array.isArray(commonValuesCopiedBlocks[subjectType].value1) && 
                                commonValuesCopiedBlocks[subjectType].value1.length > 0;
                
                if (hasBlocks) {
                    commonValuesCopiedBlocks[subjectType].value1.forEach(courseId => {
                        const course = courses.find(c => c.id === courseId);
                        if (course) {
                            const block = createCourseBlock(course, false, false);
                            wrap.appendChild(block);
                        }
                    });
                } else {
                    // 블럭이 없으면 텍스트 데이터를 블럭으로 변환 시도
                    const textValue = commonValuesCellTexts?.[subjectType]?.value1 || '';
                    
                    if (textValue) {
                            // 🔧 개선된 텍스트 파싱: HTML 태그 제거, 학점 정보 제거, 정규화
                            const cleanText = textValue
                                .replace(/<br\s*\/?>/gi, '\n')  // <br> 태그를 줄바꿈으로
                                .replace(/<[^>]*>/g, '')        // 모든 HTML 태그 제거
                                .replace(/\([^)]*\)/g, '')      // 괄호와 내용 제거 (학점 등)
                                .replace(/\s+/g, ' ')           // 연속된 공백을 하나로
                                .trim();
                            
                            const courseNames = cleanText
                                .split(/[,\n]/)                 // 쉼표나 줄바꿈으로 분리
                                .map(name => name.trim())       // 앞뒤 공백 제거
                                .filter(name => name && name.length > 1); // 빈 값이나 너무 짧은 값 제외
                            
                            let hasRenderedBlocks = false;
                            
                            
                            
                            courseNames.forEach(courseName => {
                                // 정확한 매칭 시도
                                let course = courses.find(c => c.courseName === courseName);
                                let matchType = 'exact';
                                
                                // 정확한 매칭이 실패하면 부분 매칭 시도
                                if (!course && courseName.length > 3) {
                                    course = courses.find(c => c.courseName.includes(courseName) || courseName.includes(c.courseName));
                                    matchType = 'partial';
                                }
                                
                                // 부분 매칭도 실패하면 더 관대한 매칭 시도 (공백, 하이픈, 언더스코어 제거)
                                if (!course && courseName.length > 2) {
                                    const normalizedInput = courseName.replace(/[\s\-\_]/g, '');
                                    course = courses.find(c => {
                                        const normalizedCourse = c.courseName.replace(/[\s\-\_]/g, '');
                                        return normalizedCourse.includes(normalizedInput) || normalizedInput.includes(normalizedCourse);
                                    });
                                    matchType = 'normalized';
                                }
                                
                                // 여전히 실패하면 더 적극적인 매칭 시도 (특수문자 및 숫자 제거)
                                if (!course && courseName.length > 2) {
                                    const ultraNormalized = courseName.replace(/[\s\-\_\d\(\)]/g, '');
                                    course = courses.find(c => {
                                        const normalizedCourse = c.courseName.replace(/[\s\-\_\d\(\)]/g, '');
                                        return ultraNormalized && normalizedCourse && (
                                            normalizedCourse.includes(ultraNormalized) || 
                                            ultraNormalized.includes(normalizedCourse)
                                        );
                                    });
                                    matchType = 'ultra-normalized';
                                }
                                
                                // 💡 한국어 특성을 고려한 매칭 (끝 글자 제거 시도)
                                if (!course && courseName.length > 3) {
                                    const shortened = courseName.slice(0, -1);
                                    course = courses.find(c => c.courseName.includes(shortened) || shortened.includes(c.courseName));
                                    matchType = 'shortened';
                                }
                                
                                
                                if (course) {
                                    const block = createCourseBlock(course, false, false);
                                    wrap.appendChild(block);
                                    hasRenderedBlocks = true;
                                    
                                    // 🎯 중요: commonValuesCopiedBlocks에도 저장하여 이후 렌더링에서 유지
                                    if (!commonValuesCopiedBlocks[subjectType]) {
                                        commonValuesCopiedBlocks[subjectType] = {};
                                    }
                                    if (!commonValuesCopiedBlocks[subjectType].value1) {
                                        commonValuesCopiedBlocks[subjectType].value1 = [];
                                    }
                                    if (!commonValuesCopiedBlocks[subjectType].value1.includes(course.id)) {
                                        commonValuesCopiedBlocks[subjectType].value1.push(course.id);
                                    }
                                }
                            });
                            
                            // 블럭으로 변환되지 않은 경우에만 텍스트로 표시
                            if (!hasRenderedBlocks) {
                                const value = textValue.replace(/\n/g, '<br>');
                                wrap.innerHTML = value;
                            }
                        }
                    }
                }
            }
            tdValue1.addEventListener('dragover', handleCommonValuesDragOver);
            tdValue1.addEventListener('drop', handleCommonValuesDrop);
            if (isEditModeCommonValues) {
                // [수정] VALUE1,2,3 셀은 텍스트 편집 불가능하도록 설정
                tdValue1.classList.remove('editable-cell');
            } else {
                // 일반 모드에서는 편집 가능
                tdValue1.classList.add('editable-cell');
            }
        }

        const tdValue2 = document.getElementById(`commonValues-cell-${subjectType}-value2`);
        if (tdValue2) {
            let wrap = tdValue2.querySelector('.block-wrap');
            if (!wrap) {
                wrap = document.createElement('div');
                wrap.className = 'block-wrap';
                tdValue2.appendChild(wrap);
            }
            
            // 셀이 편집 중이면 건드리지 않음
            if (!tdValue2.classList.contains('editing-cell')) {
                wrap.innerHTML = '';
                
                // [수정] 복사된 블럭 정보로 렌더링
                const hasBlocks = commonValuesCopiedBlocks[subjectType] && 
                                Array.isArray(commonValuesCopiedBlocks[subjectType].value2) && 
                                commonValuesCopiedBlocks[subjectType].value2.length > 0;
                
                if (hasBlocks) {
                    commonValuesCopiedBlocks[subjectType].value2.forEach(courseId => {
                        const course = courses.find(c => c.id === courseId);
                        if (course) {
                            const block = createCourseBlock(course, false, false);
                            wrap.appendChild(block);
                        }
                    });
                } else {
                    // 블럭이 없으면 텍스트 데이터를 블럭으로 변환 시도
                    const textValue = commonValuesCellTexts?.[subjectType]?.value2 || '';
                    
                    if (textValue) {
                            // 🔧 개선된 텍스트 파싱: HTML 태그 제거, 학점 정보 제거, 정규화
                            const cleanText = textValue
                                .replace(/<br\s*\/?>/gi, '\n')  // <br> 태그를 줄바꿈으로
                                .replace(/<[^>]*>/g, '')        // 모든 HTML 태그 제거
                                .replace(/\([^)]*\)/g, '')      // 괄호와 내용 제거 (학점 등)
                                .replace(/\s+/g, ' ')           // 연속된 공백을 하나로
                                .trim();
                            
                            const courseNames = cleanText
                                .split(/[,\n]/)                 // 쉼표나 줄바꿈으로 분리
                                .map(name => name.trim())       // 앞뒤 공백 제거
                                .filter(name => name && name.length > 1); // 빈 값이나 너무 짧은 값 제외
                            
                            let hasRenderedBlocks = false;
                            
                            courseNames.forEach(courseName => {
                                // 정확한 매칭 시도
                                let course = courses.find(c => c.courseName === courseName);
                                let matchType = 'exact';
                                
                                // 정확한 매칭이 실패하면 부분 매칭 시도
                                if (!course && courseName.length > 3) {
                                    course = courses.find(c => c.courseName.includes(courseName) || courseName.includes(c.courseName));
                                    matchType = 'partial';
                                }
                                
                                // 부분 매칭도 실패하면 더 관대한 매칭 시도 (공백, 하이픈, 언더스코어 제거)
                                if (!course && courseName.length > 2) {
                                    const normalizedInput = courseName.replace(/[\s\-\_]/g, '');
                                    course = courses.find(c => {
                                        const normalizedCourse = c.courseName.replace(/[\s\-\_]/g, '');
                                        return normalizedCourse.includes(normalizedInput) || normalizedInput.includes(normalizedCourse);
                                    });
                                    matchType = 'normalized';
                                }
                                
                                // 여전히 실패하면 더 적극적인 매칭 시도 (특수문자 및 숫자 제거)
                                if (!course && courseName.length > 2) {
                                    const ultraNormalized = courseName.replace(/[\s\-\_\d\(\)]/g, '');
                                    course = courses.find(c => {
                                        const normalizedCourse = c.courseName.replace(/[\s\-\_\d\(\)]/g, '');
                                        return ultraNormalized && normalizedCourse && (
                                            normalizedCourse.includes(ultraNormalized) || 
                                            ultraNormalized.includes(normalizedCourse)
                                        );
                                    });
                                    matchType = 'ultra-normalized';
                                }
                                
                                // 💡 한국어 특성을 고려한 매칭 (끝 글자 제거 시도)
                                if (!course && courseName.length > 3) {
                                    const shortened = courseName.slice(0, -1);
                                    course = courses.find(c => c.courseName.includes(shortened) || shortened.includes(c.courseName));
                                    matchType = 'shortened';
                                }
                                
                                
                                if (course) {
                                    const block = createCourseBlock(course, false, false);
                                    wrap.appendChild(block);
                                    hasRenderedBlocks = true;
                                    
                                    // 🎯 중요: commonValuesCopiedBlocks에도 저장하여 이후 렌더링에서 유지
                                    if (!commonValuesCopiedBlocks[subjectType]) {
                                        commonValuesCopiedBlocks[subjectType] = {};
                                    }
                                    if (!commonValuesCopiedBlocks[subjectType].value2) {
                                        commonValuesCopiedBlocks[subjectType].value2 = [];
                                    }
                                    if (!commonValuesCopiedBlocks[subjectType].value2.includes(course.id)) {
                                        commonValuesCopiedBlocks[subjectType].value2.push(course.id);
                                    }
                                }
                            });
                            
                            // 블럭으로 변환되지 않은 경우에만 텍스트로 표시
                            if (!hasRenderedBlocks) {
                                const value = textValue.replace(/\n/g, '<br>');
                                wrap.innerHTML = value;
                            }
                        }
                    }
                }
            }
            tdValue2.addEventListener('dragover', handleCommonValuesDragOver);
            tdValue2.addEventListener('drop', handleCommonValuesDrop);
            if (isEditModeCommonValues) {
                // [수정] VALUE1,2,3 셀은 텍스트 편집 불가능하도록 설정
                tdValue2.classList.remove('editable-cell');
            } else {
                // 일반 모드에서는 편집 가능
                tdValue2.classList.add('editable-cell');
            }
        }

        const tdValue3 = document.getElementById(`commonValues-cell-${subjectType}-value3`);
        if (tdValue3) {
            let wrap = tdValue3.querySelector('.block-wrap');
            if (!wrap) {
                wrap = document.createElement('div');
                wrap.className = 'block-wrap';
                tdValue3.appendChild(wrap);
            }
            
            // 셀이 편집 중이면 건드리지 않음
            if (!tdValue3.classList.contains('editing-cell')) {
                wrap.innerHTML = '';
                
                // [수정] 복사된 블럭 정보로 렌더링
                const hasBlocks = commonValuesCopiedBlocks[subjectType] && 
                                Array.isArray(commonValuesCopiedBlocks[subjectType].value3) && 
                                commonValuesCopiedBlocks[subjectType].value3.length > 0;
                
                if (hasBlocks) {
                    commonValuesCopiedBlocks[subjectType].value3.forEach(courseId => {
                        const course = courses.find(c => c.id === courseId);
                        if (course) {
                            const block = createCourseBlock(course, false, false);
                            wrap.appendChild(block);
                        }
                    });
                } else {
                    // 블럭이 없으면 텍스트 데이터를 블럭으로 변환 시도
                    const textValue = commonValuesCellTexts?.[subjectType]?.value3 || '';
                    
                    if (textValue) {
                            // 🔧 개선된 텍스트 파싱: HTML 태그 제거, 학점 정보 제거, 정규화
                            const cleanText = textValue
                                .replace(/<br\s*\/?>/gi, '\n')  // <br> 태그를 줄바꿈으로
                                .replace(/<[^>]*>/g, '')        // 모든 HTML 태그 제거
                                .replace(/\([^)]*\)/g, '')      // 괄호와 내용 제거 (학점 등)
                                .replace(/\s+/g, ' ')           // 연속된 공백을 하나로
                                .trim();
                            
                            const courseNames = cleanText
                                .split(/[,\n]/)                 // 쉼표나 줄바꿈으로 분리
                                .map(name => name.trim())       // 앞뒤 공백 제거
                                .filter(name => name && name.length > 1); // 빈 값이나 너무 짧은 값 제외
                            
                            let hasRenderedBlocks = false;
                            
                            courseNames.forEach(courseName => {
                                // 정확한 매칭 시도
                                let course = courses.find(c => c.courseName === courseName);
                                let matchType = 'exact';
                                
                                // 정확한 매칭이 실패하면 부분 매칭 시도
                                if (!course && courseName.length > 3) {
                                    course = courses.find(c => c.courseName.includes(courseName) || courseName.includes(c.courseName));
                                    matchType = 'partial';
                                }
                                
                                // 부분 매칭도 실패하면 더 관대한 매칭 시도 (공백, 하이픈, 언더스코어 제거)
                                if (!course && courseName.length > 2) {
                                    const normalizedInput = courseName.replace(/[\s\-\_]/g, '');
                                    course = courses.find(c => {
                                        const normalizedCourse = c.courseName.replace(/[\s\-\_]/g, '');
                                        return normalizedCourse.includes(normalizedInput) || normalizedInput.includes(normalizedCourse);
                                    });
                                    matchType = 'normalized';
                                }
                                
                                // 여전히 실패하면 더 적극적인 매칭 시도 (특수문자 및 숫자 제거)
                                if (!course && courseName.length > 2) {
                                    const ultraNormalized = courseName.replace(/[\s\-\_\d\(\)]/g, '');
                                    course = courses.find(c => {
                                        const normalizedCourse = c.courseName.replace(/[\s\-\_\d\(\)]/g, '');
                                        return ultraNormalized && normalizedCourse && (
                                            normalizedCourse.includes(ultraNormalized) || 
                                            ultraNormalized.includes(normalizedCourse)
                                        );
                                    });
                                    matchType = 'ultra-normalized';
                                }
                                
                                // 💡 한국어 특성을 고려한 매칭 (끝 글자 제거 시도)
                                if (!course && courseName.length > 3) {
                                    const shortened = courseName.slice(0, -1);
                                    course = courses.find(c => c.courseName.includes(shortened) || shortened.includes(c.courseName));
                                    matchType = 'shortened';
                                }
                                
                                
                                if (course) {
                                    const block = createCourseBlock(course, false, false);
                                    wrap.appendChild(block);
                                    hasRenderedBlocks = true;
                                    
                                    // 🎯 중요: commonValuesCopiedBlocks에도 저장하여 이후 렌더링에서 유지
                                    if (!commonValuesCopiedBlocks[subjectType]) {
                                        commonValuesCopiedBlocks[subjectType] = {};
                                    }
                                    if (!commonValuesCopiedBlocks[subjectType].value3) {
                                        commonValuesCopiedBlocks[subjectType].value3 = [];
                                    }
                                    if (!commonValuesCopiedBlocks[subjectType].value3.includes(course.id)) {
                                        commonValuesCopiedBlocks[subjectType].value3.push(course.id);
                                    }
                                }
                            });
                            
                            // 블럭으로 변환되지 않은 경우에만 텍스트로 표시
                            if (!hasRenderedBlocks) {
                                const value = textValue.replace(/\n/g, '<br>');
                                wrap.innerHTML = value;
                            }
                        }
                    }
                }
            }
            tdValue3.addEventListener('dragover', handleCommonValuesDragOver);
            tdValue3.addEventListener('drop', handleCommonValuesDrop);
            if (isEditModeCommonValues) {
                // [수정] VALUE1,2,3 셀은 텍스트 편집 불가능하도록 설정
                tdValue3.classList.remove('editable-cell');
            } else {
                // 일반 모드에서는 편집 가능
                tdValue3.classList.add('editable-cell');
            }
        }
    });

    // 미분류 교과목 별도 표 렌더링(기존 방식 유지)
    const unclassifiedTbody = document.getElementById('unclassifiedTableBody');
    if (unclassifiedTbody) {
        unclassifiedTbody.innerHTML = '';
        const unclassifiedCourses = courses.filter(c => c.subjectType === '미분류' && c.category !== '교양');
        if (unclassifiedCourses.length > 0) {
            const tr = document.createElement('tr');
            const tdType = document.createElement('td');
            tdType.className = 'col-type';
            tdType.textContent = '미분류';
            tr.appendChild(tdType);
            const tdRequired = document.createElement('td');
            tdRequired.className = 'col-major-required';
            tdRequired.id = 'commonValues-cell-미분류-필수';
            const requiredUnclassified = unclassifiedCourses.filter(c => c.isRequired === '필수');
            requiredUnclassified.forEach(course => {
                const block = createCourseBlock(course, false, false);
                tdRequired.appendChild(block);
            });
            tdRequired.addEventListener('dragover', handleCommonValuesDragOver);
            tdRequired.addEventListener('drop', handleCommonValuesDrop);
            tr.appendChild(tdRequired);
            const tdRequiredCredit = document.createElement('td');
            tdRequiredCredit.className = 'col-major-required-credit';
            tdRequiredCredit.id = 'commonValues-cell-미분류-필수-학점';
            tdRequiredCredit.textContent = requiredUnclassified.reduce((sum, c) => sum + (c.credits || 0), 0);
            tr.appendChild(tdRequiredCredit);
            const tdElective = document.createElement('td');
            tdElective.className = 'col-major-elective';
            tdElective.id = 'commonValues-cell-미분류-선택';
            const electiveUnclassified = unclassifiedCourses.filter(c => c.isRequired === '선택');
            electiveUnclassified.forEach(course => {
                const block = createCourseBlock(course, false, false);
                tdElective.appendChild(block);
            });
            tdElective.addEventListener('dragover', handleCommonValuesDragOver);
            tdElective.addEventListener('drop', handleCommonValuesDrop);
            tr.appendChild(tdElective);
            const tdElectiveCredit = document.createElement('td');
            tdElectiveCredit.className = 'col-major-elective-credit';
            tdElectiveCredit.id = 'commonValues-cell-미분류-선택-학점';
            tdElectiveCredit.textContent = electiveUnclassified.reduce((sum, c) => sum + (c.credits || 0), 0);
            tr.appendChild(tdElectiveCredit);
            
            unclassifiedTbody.appendChild(tr);
        }
    }

    // 표 아래에 배치되지 않은 교과목 블럭 나열 (미분류 제외)
    const assignedIds = new Set();
    subjectTypes.forEach(subjectType => {
        courses.forEach(c => {
            if (c.subjectType === subjectType) {
                assignedIds.add(c.id);
            }
        });
    });
    courses.forEach(c => {
        if (c.subjectType === '미분류') {
            assignedIds.add(c.id);
        }
    });
    const unassigned = courses.filter(c => !assignedIds.has(c.id));
    const unassignedDiv = document.getElementById('commonValuesUnassignedBlocks');
    if (unassignedDiv) {
        unassignedDiv.innerHTML = '';
        if (unassigned.length > 0) {
            const label = document.createElement('div');
            label.textContent = '표에 배치되지 않은 교과목';
            label.style.fontWeight = 'bold';
            label.style.marginBottom = '8px';
            unassignedDiv.appendChild(label);
            unassigned.forEach(course => {
                const block = createCourseBlock(course, false, false);
                unassignedDiv.appendChild(block);
            });
        }
    }
    
    // 모든 렌더링 작업 끝난 후 그래프도 갱신
    renderCommonValuesNetworkGraph();
}

// 폴리곤 선택 상태 관리 (전역)
let selectedCommonValuesBlob = null;
const commonValuesBlobData = {};

// 그룹명 사용자 지정 매핑
let commonValuesGroupNames = {
    value1: '환경의 지속가능성',
    value2: '미래기술의 활용',
    value3: '창의적 문제해결'
};

// VALUE별 교과목 id 목록 (전역)
let valueCourseIds = { value1: [], value2: [], value3: [] };
const valueKeys = ['value1', 'value2', 'value3'];
let groupLabelPositions = new Map(); // 그룹 라벨 위치 저장 {groupKey -> {x, y, width, height}}

function renderCommonValuesNetworkGraph() {
    const container = document.getElementById('commonValuesNetworkGraph');
    if (!container) return;

    // VALUE1,2,3에 포함된 교과목 id를 모두 모은다
    const subjectTypes = [
        '설계', '디지털', '역사', '이론', '도시', '사회', '기술', '실무', '비교과'
    ];
    // 전역 valueCourseIds 초기화
    valueCourseIds = { value1: [], value2: [], value3: [] };
    
    subjectTypes.forEach(subjectType => {
        valueKeys.forEach(key => {
            if (commonValuesCopiedBlocks[subjectType] && Array.isArray(commonValuesCopiedBlocks[subjectType][key])) {
                valueCourseIds[key].push(...commonValuesCopiedBlocks[subjectType][key]);
            }
        });
    });
    // 중복 제거
    valueKeys.forEach(key => {
        valueCourseIds[key] = Array.from(new Set(valueCourseIds[key]));
    });

    // 노드: 교과목만 추가 (VALUE1,2,3 노드 제거)
    const nodes = [];
    const nodeIdSet = new Set();
    valueKeys.forEach(key => {
        valueCourseIds[key].forEach((courseId, idx) => {
            if (!nodeIdSet.has(courseId)) {
                const course = courses.find(c => c.id === courseId);
                if (course) {
                    let nodeColor = {};
                    if (colorModeBySubjectType) {
                        const typeClass = getSubjectTypeClass(course.subjectType);
                        nodeColor.background = {
                            'type-design': '#e8e8e8',
                            'type-digital': '#f5f2e5',
                            'type-history': '#ffece1',
                            'type-theory': '#e0f2f1',
                            'type-urban': '#fce4ec',
                            'type-social': '#e8eaf6',
                            'type-tech': '#fff3e0',
                            'type-practice': '#e8f5e8',
                            'type-extracurricular': '#f1f8e9',
                            'type-unclassified': '#f6f6f6',
                            'type-default': '#f5f5f5'
                        }[typeClass] || '#f5f5f5';
                        nodeColor.border = '#bdbdbd';
                    } else {
                        const catClass = getCategoryClass(course.category);
                        nodeColor.background = {
                            'category-liberal': '#e9ecef',
                            'category-thinking': '#e3f2fd',
                            'category-design': '#ffebee',
                            'category-tech': '#fff3e0',
                            'category-practice': '#e8f5e8',
                            'category-etc': '#f3e5f5'
                        }[catClass] || '#f8f9fa';
                        nodeColor.border = '#adb5bd';
                    }
                    // 그룹 라벨 위치 기준으로 노드 초기 위치 배치 (라벨 아래쪽, x축으로 분산)
                    let initX = undefined, initY = undefined;
                    if (typeof groupLabelPositions !== 'undefined' && groupLabelPositions[key]) {
                        initX = groupLabelPositions[key].x + (idx * 60) - (30 * valueCourseIds[key].length);
                        initY = groupLabelPositions[key].y + 80;
                        // 속하지 않은 그룹 폴리곤(hull)과 일정 거리 이상 떨어지도록 위치 조정
                        valueKeys.forEach(otherKey => {
                            if (otherKey !== key && commonValuesBlobData[otherKey]) {
                                // hull 경계와의 최소 거리 계산
                                const hull = commonValuesBlobData[otherKey];
                                let minDist = Infinity;
                                hull.forEach(pt => {
                                    const dx = initX - pt.x;
                                    const dy = initY - pt.y;
                                    const dist = Math.sqrt(dx*dx + dy*dy);
                                    if (dist < minDist) minDist = dist;
                                });
                                // 만약 너무 가까우면(60px 미만) hull 바깥 방향으로 밀어냄
                                if (minDist < 60) {
                                    // hull 중심 계산
                                    let hullCenterX = 0, hullCenterY = 0;
                                    hull.forEach(pt => { hullCenterX += pt.x; hullCenterY += pt.y; });
                                    hullCenterX /= hull.length; hullCenterY /= hull.length;
                                    // 바깥 방향으로 60-minDist 만큼 이동
                                    const dx = initX - hullCenterX;
                                    const dy = initY - hullCenterY;
                                    const len = Math.sqrt(dx*dx + dy*dy) || 1;
                                    initX += (dx/len) * (60-minDist);
                                    initY += (dy/len) * (60-minDist);
                                }
                            }
                        });
                    }
                    nodes.push({
                        id: course.id,
                        label: course.courseName,
                        group: key,
                        shape: 'box',
                        color: {
                            background: nodeColor.background,
                            border: nodeColor.border
                        },
                        x: initX,
                        y: initY,
                        fixed: false
                    });
                    nodeIdSet.add(courseId);
                }
            }
        });
    });

    // 엣지: 같은 학년-학기 내 교과목끼리만 연결
    const edges = [];
    // 모든 노드(course) 정보를 id로 빠르게 참조
    const nodeCourseMap = {};
    nodes.forEach(n => {
        const course = courses.find(c => c.id === n.id);
        if (course) nodeCourseMap[n.id] = course;
    });
    // yearSemester별로 그룹화
    const yearSemesterGroups = {};
    nodes.forEach(n => {
        const course = nodeCourseMap[n.id];
        if (course && course.yearSemester) {
            if (!yearSemesterGroups[course.yearSemester]) yearSemesterGroups[course.yearSemester] = [];
            yearSemesterGroups[course.yearSemester].push(n.id);
        }
    });
    // 각 yearSemester 그룹 내에서 모든 쌍 연결 (단, 자기 자신 제외)
    Object.entries(yearSemesterGroups).forEach(([yearSemester, groupIds]) => {
        for (let i = 0; i < groupIds.length; i++) {
            for (let j = i + 1; j < groupIds.length; j++) {
                // 같은 학년-학기 연결은 더 두껍게, yearSemester 텍스트 팝업
                edges.push({ from: groupIds[i], to: groupIds[j], width: 4, title: yearSemester });
                edges.push({ from: groupIds[j], to: groupIds[i], width: 4, title: yearSemester });
            }
        }
    });

    // 추가: 같은 분야(subjectType)에 있는 노드들도 모두 연결
    const subjectTypeGroups = {};
    nodes.forEach(n => {
        const course = nodeCourseMap[n.id];
        if (course && course.subjectType) {
            if (!subjectTypeGroups[course.subjectType]) subjectTypeGroups[course.subjectType] = [];
            subjectTypeGroups[course.subjectType].push(n.id);
        }
    });
    Object.values(subjectTypeGroups).forEach(groupIds => {
        for (let i = 0; i < groupIds.length; i++) {
            for (let j = i + 1; j < groupIds.length; j++) {
                edges.push({ from: groupIds[i], to: groupIds[j] });
                edges.push({ from: groupIds[j], to: groupIds[i] });
            }
        }
    });

    // 네트워크 옵션 (개별 노드 스타일을 덮어쓰지 않도록 최소화)
    const options = {
        nodes: {
            chosen: true,
            shadow: {
                enabled: true,
                color: 'rgba(0,0,0,0.3)',
                size: 8,
                x: 2,
                y: 2
            },
            borderWidth: 2,
            borderWidthSelected: 3
        },
        edges: {
            color: { color: '#bdbdbd', highlight: '#1976d2' },
            arrows: { to: { enabled: true, scaleFactor: 0.7 } },
            smooth: { type: 'cubicBezier', forceDirection: 'horizontal', roundness: 0.4 },
            length: 220 // 엣지 길이 더 길게
        },
        layout: {
            improvedLayout: true,
            hierarchical: false,
        },
        physics: {
            enabled: true,
            barnesHut: {
                gravitationalConstant: -2000, // 더 강한 반발력
                centralGravity: 0.2, // 중앙 중력 거의 제거
                springLength: 12000, // 적당한 스프링 길이
                springConstant: 0.0008, // 더 강한 스프링
                damping: 0.95, // 더 강한 감쇠로 부드러운 움직임
                avoidOverlap: 2 // 겹침 방지
            },
            stabilization: { iterations: 30 },
            adaptiveTimestep: true, // 적응형 시간 간격
        },
        interaction: {
            hover: true,
            tooltipDelay: 120,
        },
        autoResize: true,
        height: '100%',
        width: '100%',
    };

    // 기존 네트워크 제거
    container.innerHTML = '';
    container.style.display = 'block';
    
    // 모든 노드에 기본 스타일 적용 및 VALUE 그룹 소속 수에 따른 글씨 크기 조정
    nodes.forEach(n => {
        // 해당 노드가 몇 개의 VALUE 그룹에 속하는지 계산
        let valueGroupCount = 0;
        valueKeys.forEach(key => {
            if (valueCourseIds[key].includes(n.id)) {
                valueGroupCount++;
            }
        });
        
        // VALUE 그룹 소속 수에 따라 글씨 크기와 테두리 두께를 함께 조정
        const baseFontSize = 13;
        const fontSizeStep = 2; // 그룹 하나당 2px 증가
        const adjustedFontSize = baseFontSize + valueGroupCount * fontSizeStep;

        // 테두리 두께도 그룹 수에 따라 증가 (기본 2 + 그룹당 1)
        const baseBorderWidth = 1;
        const adjustedBorderWidth = baseBorderWidth + valueGroupCount;

        n.font = {
            size: adjustedFontSize,
            color: '#495057',
            face: 'Noto Sans KR, Arial, sans-serif',
            weight: '700',
            bold: true,
            strokeWidth: 1,
            strokeColor: '#495057'
        };
        n.borderWidth = adjustedBorderWidth;
        n.shapeProperties = {
            borderRadius: 12
        };
        n.margin = {
            top: 2,
            right: 6,
            bottom: 2,
            left: 6
        };
        
        // 모든 노드를 박스 모양으로 유지하여 교과목 이름이 잘 보이도록
        n.shape = 'box';
        
        // 교과목 이름 표시 보장
        if (!n.label && n.title) {
            n.label = n.title;
        }
        
        // 박스 크기: VALUE 그룹 수에 따라 조정
        const sizeMultiplier = 1 + (valueGroupCount * 0.1); // 10%씩 증가
        n.widthConstraint = { 
            minimum: Math.round(80 * sizeMultiplier), 
            maximum: Math.round(180 * sizeMultiplier) 
        };
        n.heightConstraint = { 
            minimum: Math.round(30 * sizeMultiplier), 
            maximum: Math.round(50 * sizeMultiplier) 
        };
        
        // 모서리 처리: 교과목 블럭 스타일 (12px radius)
        n.shapeProperties = {
            borderRadius: 12 // 교과목 블럭과 동일한 둥근 모서리
        };
        
        // 여백: 교과목 블럭과 유사한 패딩 효과
        n.margin = {
            top: 2,
            right: 6,
            bottom: 2,
            left: 6
        };
    });

    // vis-network 인스턴스 생성 (스타일링 적용된 노드로)
    const network = new vis.Network(container, { nodes: new vis.DataSet(nodes), edges: new vis.DataSet(edges) }, options);
    
    // 그룹 경계 반발력 시스템
    let boundaryForces = new Map(); // nodeId -> {x, y} force vectors
    let repulsionSystemActive = true;
    let repulsionInterval = null;
    let stabilityCheckCount = 0; // 안정화 체크 카운터
    let lastNodePositions = new Map(); // 이전 노드 위치 저장
    const stabilityThreshold = 0.5; // 안정화 임계값 (픽셀 단위)
    
    // 반발력 시스템을 즉시 시작 (네트워크 안정화와 무관하게)
    
    // 스플라인 데이터가 없는 경우를 대비한 테스트 데이터 생성
    setTimeout(() => {
        if (!commonValuesBlobData.value1 || commonValuesBlobData.value1.length === 0) {
            // 각 그룹 주변에 간단한 직사각형 스플라인 생성
            valueKeys.forEach((key, index) => {
                const centerX = 200 + (index * 300); // 그룹별로 300px씩 떨어뜨림
                const centerY = 200;
                const width = 150;
                const height = 150;
                
                commonValuesBlobData[key] = [
                    {x: centerX - width/2, y: centerY - height/2}, // 왼쪽 위
                    {x: centerX + width/2, y: centerY - height/2}, // 오른쪽 위
                    {x: centerX + width/2, y: centerY + height/2}, // 오른쪽 아래
                    {x: centerX - width/2, y: centerY + height/2}  // 왼쪽 아래
                ];
            });
        }
        startRepulsionSystem();
    }, 500); // 0.5초 후 즉시 시작
    
    // 네트워크 안정화 완료 후에도 다시 한번 확인
    network.on('stabilizationIterationsDone', function() {
        if (!repulsionInterval) {
            startRepulsionSystem();
        }
    });
    
    // 최종 백업 - 2초 후 무조건 시작
    setTimeout(() => {
        if (!repulsionInterval) {
            startRepulsionSystem();
        }
    }, 2000);
    
    // 그룹 스플라인 침입 방지 및 밀어내기 함수
    function calculateBoundaryRepulsion() {
        boundaryForces.clear();
        
        // 모든 노드에 대해 반발력 계산
        const allNodes = network.getPositions();
        let totalNodesProcessed = 0;
        let nodesWithForces = 0;
        
        Object.entries(allNodes).forEach(([nodeId, position]) => {
            if (!position || typeof position.x !== 'number' || typeof position.y !== 'number') return;
            
            // 드래그 중인 그룹의 노드는 반발력/인력 계산에서 제외
            let skipNodeForces = false;
            if (isDraggingGroup && draggedGroupKey) {
                const draggedGroupNodes = valueCourseIds[draggedGroupKey] || [];
                if (draggedGroupNodes.includes(nodeId)) {
                    skipNodeForces = true;
                }
            }
            
            totalNodesProcessed++;
            
            if (skipNodeForces) return; // 드래그 중인 노드는 힘 계산 건너뛰기
            
            // 1. 그룹 라벨과 노드 간의 스프링 반발력 계산 (더 넓은 범위)
            groupLabelPositions.forEach((labelPos, groupKey) => {
                const dx = position.x - labelPos.x;
                const dy = position.y - labelPos.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                const maxRepulsionDistance = 200; // 반발력이 작용하는 최대 거리 (기존 120 → 200)
                
                if (distance > 0 && distance < maxRepulsionDistance) {
                    // 스프링 반발력 공식: F = k * (equilibrium_distance - current_distance)
                    const equilibriumDistance = 160; // 평형 거리 (증가)
                    const springConstant = 1.2; // 스프링 상수 (증가)
                    
                    // 라벨 크기를 고려한 추가 반발력
                    const labelWidth = labelPos.width || 100;
                    const labelHeight = labelPos.height || 30;
                    
                    // 라벨 중심으로부터의 거리에 따른 반발력 계산
                    let forceMultiplier = 1.0;
                    
                    // 라벨의 직사각형 영역 내부인지 확인
                    const insideRect = Math.abs(dx) < labelWidth/2 && Math.abs(dy) < labelHeight/2;
                    if (insideRect) {
                        forceMultiplier = 5.0; // 라벨 직사각형 내부에서는 5배 강한 반발력 (증가)
                    } else if (distance < equilibriumDistance) {
                        // 평형 거리보다 가까운 경우 거리에 반비례하는 강한 반발력
                        forceMultiplier = 3.0 + (equilibriumDistance - distance) / equilibriumDistance; // 기본값 증가
                    } else {
                        // 평형 거리보다 먼 경우에도 약간의 밀어내는 힘 유지
                        forceMultiplier = 0.3; // 0.1에서 0.3으로 증가
                    }
                    
                    // 스프링 반발력 계산
                    const springForce = springConstant * (equilibriumDistance - distance) * forceMultiplier;
                    
                    // 거리 기반 감쇠 (너무 멀리서는 약한 힘)
                    const dampingFactor = Math.max(0.1, (maxRepulsionDistance - distance) / maxRepulsionDistance);
                    const finalForce = springForce * dampingFactor;
                    
                    // 정규화된 방향 벡터
                    const normalizedX = dx / distance;
                    const normalizedY = dy / distance;
                    
                    if (!boundaryForces.has(nodeId)) {
                        boundaryForces.set(nodeId, { x: 0, y: 0 });
                    }
                    const currentForce = boundaryForces.get(nodeId);
                    currentForce.x += normalizedX * finalForce;
                    currentForce.y += normalizedY * finalForce;
                }
            });
            
            // 2. 강화된 스플라인 경계 반발력 계산 (그룹 외부 노드들을 밖으로 밀어내기)
            valueKeys.forEach(groupKey => {
                const groupBoundary = commonValuesBlobData[groupKey];
                if (!groupBoundary || groupBoundary.length < 3) return;
                
                const groupNodeIds = valueCourseIds[groupKey] || [];
                const isGroupMember = groupNodeIds.includes(nodeId);
                
                // 테스트: 모든 노드에 스플라인 반발력 적용 (그룹 멤버십 무시)
                const testMode = true; // 테스트용
                if (!isGroupMember || testMode) {
                    const isInsideSpline = isPointInPolygon(position, groupBoundary);
                    const distanceToSpline = getDistanceToSpline(position, groupBoundary);
                    const maxRepulsionDistance = 150; // 반발력 작용 범위 증가
                    
                    // 강제적으로 더 넓은 범위에서 반발력 적용
                    if (isInsideSpline || distanceToSpline < maxRepulsionDistance) {
                        // 스플라인 내부 또는 근처에 있는 외부 노드 처리
                        
                        let forceMultiplier = 1.0;
                        let baseForceStrength = 200; // 기본 반발력 강화
                        
                        if (isInsideSpline) {
                            // 스플라인 내부에 있는 경우 - 매우 강한 반발력
                            forceMultiplier = 6.0; // 4.0 → 6.0 증가
                            baseForceStrength = 500; // 300 → 500 증가
                        } else if (distanceToSpline < 30) {
                            // 경계 매우 근처 - 강한 반발력
                            forceMultiplier = 4.0; // 3.0 → 4.0 증가
                            baseForceStrength = 400; // 250 → 400 증가
                        } else if (distanceToSpline < 60) {
                            // 경계 근처 - 중간 반발력
                            forceMultiplier = 3.0; // 2.0 → 3.0 증가
                            baseForceStrength = 300; // 200 → 300 증가
                        } else {
                            // 멀리 있지만 영향권 내 - 약한 반발력
                            forceMultiplier = 2.0; // 1.0 → 2.0 증가
                            baseForceStrength = 200; // 150 → 200 증가
                        }
                        
                        // 거리에 따른 추가 감쇠
                        const distanceDecay = Math.max(0.3, 1.0 - (distanceToSpline / maxRepulsionDistance));
                        const finalForceStrength = baseForceStrength * forceMultiplier * distanceDecay;
                        
                        const repulsionForce = calculateSplineRepulsion(position, groupBoundary, finalForceStrength);
                        
                        if (!boundaryForces.has(nodeId)) {
                            boundaryForces.set(nodeId, { x: 0, y: 0 });
                        }
                        const currentForce = boundaryForces.get(nodeId);
                        currentForce.x += repulsionForce.x;
                        currentForce.y += repulsionForce.y;
                        
                        // 안정화 체크 - 스플라인 근처에 외부 노드가 있으면 불안정으로 간주
                        if (distanceToSpline < 40 || isInsideSpline) {
                            stabilityCheckCount = 0; // 강제로 불안정 상태 유지
                        }
                    }
                }
            });
            
            // 3. 그룹 내 노드들 간의 인력 (같은 그룹끼리 모이도록)
            valueKeys.forEach(groupKey => {
                const groupNodeIds = valueCourseIds[groupKey] || [];
                const isGroupMember = groupNodeIds.includes(nodeId);
                
                if (isGroupMember && groupNodeIds.length > 1) {
                    // 1. 그룹 중심점으로의 인력
                    const groupPositions = groupNodeIds.map(id => network.getPosition(id)).filter(pos => pos);
                    if (groupPositions.length > 0) {
                        const centerX = groupPositions.reduce((sum, pos) => sum + pos.x, 0) / groupPositions.length;
                        const centerY = groupPositions.reduce((sum, pos) => sum + pos.y, 0) / groupPositions.length;
                        
                        // 중심점으로의 인력 계산
                        const dx = centerX - position.x;
                        const dy = centerY - position.y;
                        const distanceToCenter = Math.sqrt(dx * dx + dy * dy);
                        
                        if (distanceToCenter > 20) { // 더 먼 거리에서만 작동 (10 → 20)
                            const attractionStrength = Math.min(15, distanceToCenter * 0.1); // 인력 대폭 약화 (80→15, 0.5→0.1)
                            const normalizedX = dx / distanceToCenter;
                            const normalizedY = dy / distanceToCenter;
                            
                            if (!boundaryForces.has(nodeId)) {
                                boundaryForces.set(nodeId, { x: 0, y: 0 });
                            }
                            const currentForce = boundaryForces.get(nodeId);
                            currentForce.x += normalizedX * attractionStrength * 0.3; // 추가로 30%로 약화
                            currentForce.y += normalizedY * attractionStrength * 0.3;
                            
                        }
                    }
                    
                    // 2. 그룹 내 노드들 간의 상호 인력 (스프링 연결)
                    groupNodeIds.forEach(otherNodeId => {
                        if (otherNodeId !== nodeId) {
                            const otherPos = network.getPosition(otherNodeId);
                            if (otherPos) {
                                const dx = otherPos.x - position.x;
                                const dy = otherPos.y - position.y;
                                const distance = Math.sqrt(dx * dx + dy * dy);
                                
                                if (distance > 30 && distance < 120) { // 더 제한적인 거리에서만 인력 작용 (20→30, 200→120)
                                    const springForce = Math.min(8, distance * 0.05); // 스프링 인력 대폭 약화 (30→8, 0.15→0.05)
                                    const normalizedX = dx / distance;
                                    const normalizedY = dy / distance;
                                    
                                    if (!boundaryForces.has(nodeId)) {
                                        boundaryForces.set(nodeId, { x: 0, y: 0 });
                                    }
                                    const currentForce = boundaryForces.get(nodeId);
                                    currentForce.x += normalizedX * springForce * 0.2; // 더 약하게 적용 (0.5 → 0.2)
                                    currentForce.y += normalizedY * springForce * 0.2;
                                }
                            }
                        }
                    });
                }
            });
            
            // 이 노드에 반발력이 적용되었는지 체크
            if (boundaryForces.has(nodeId)) {
                nodesWithForces++;
            }
        });
        
        // 계산 결과 로그
        if (totalNodesProcessed > 0) {
            const blobDataStatus = valueKeys.map(key => `${key}: ${commonValuesBlobData[key] ? 'OK' : 'MISSING'}`).join(', ');
            const labelStatus = valueKeys.map(key => `${key}: ${groupLabelPositions.has(key) ? 'OK' : 'MISSING'}`).join(', ');
        }
    }
    
    // 스플라인으로부터의 반발력 계산
    function calculateSplineRepulsion(nodePosition, splineBoundary, force) {
        let totalForceX = 0;
        let totalForceY = 0;
        
        // 스플라인 경계의 각 점에서 반발력 계산
        splineBoundary.forEach(point => {
            const dx = nodePosition.x - point.x;
            const dy = nodePosition.y - point.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0 && distance < 200) { // 영향 범위
                const forceStrength = force / (distance + 1);
                const normalizedX = dx / distance;
                const normalizedY = dy / distance;
                
                totalForceX += normalizedX * forceStrength;
                totalForceY += normalizedY * forceStrength;
            }
        });
        
        return { x: totalForceX, y: totalForceY };
    }
    
    // 노드에서 스플라인까지의 최단 거리 계산
    function getDistanceToSpline(nodePosition, splineBoundary) {
        let minDistance = Infinity;
        
        for (let i = 0; i < splineBoundary.length; i++) {
            const point = splineBoundary[i];
            const distance = Math.sqrt(
                Math.pow(nodePosition.x - point.x, 2) + 
                Math.pow(nodePosition.y - point.y, 2)
            );
            minDistance = Math.min(minDistance, distance);
        }
        
        return minDistance;
    }
    
    // 노드 위치 안정화 상태 체크 함수
    function checkStability() {
        const currentPositions = network.getPositions();
        let isStable = true;
        let maxMovement = 0;
        let hasSplineIntruders = false;
        
        Object.entries(currentPositions).forEach(([nodeId, position]) => {
            // 기본 이동 거리 체크
            if (lastNodePositions.has(nodeId)) {
                const lastPos = lastNodePositions.get(nodeId);
                const movement = Math.sqrt(
                    Math.pow(position.x - lastPos.x, 2) + 
                    Math.pow(position.y - lastPos.y, 2)
                );
                maxMovement = Math.max(maxMovement, movement);
                
                if (movement > stabilityThreshold) {
                    isStable = false;
                }
            }
            
            // 스플라인 침입자 체크
            valueKeys.forEach(groupKey => {
                const groupBoundary = commonValuesBlobData[groupKey];
                const groupNodeIds = valueCourseIds[groupKey] || [];
                if (!groupNodeIds.includes(nodeId) && groupBoundary) {
                    const isInsideSpline = isPointInPolygon(position, groupBoundary);
                    const distanceToSpline = getDistanceToSpline(position, groupBoundary);
                    
                    // 스플라인 내부 또는 너무 가까이 있는 외부 노드
                    if (isInsideSpline || distanceToSpline < 35) {
                        hasSplineIntruders = true;
                        isStable = false;
                    }
                }
            });
            
            lastNodePositions.set(nodeId, { x: position.x, y: position.y });
        });
        
        // 스플라인 침입자가 있으면 무조건 불안정
        if (hasSplineIntruders) {
            stabilityCheckCount = 0;
            isStable = false;
        } else if (isStable) {
            stabilityCheckCount++;
        } else {
            stabilityCheckCount = 0; // 불안정하면 카운터 리셋
        }
        
        // 8번 연속 안정화되고 침입자가 없어야 완전 안정화로 간주 (그룹 인력으로 인해 더 오래 안정화 필요)
        return { 
            isStable: stabilityCheckCount >= 8 && !hasSplineIntruders, 
            maxMovement, 
            checkCount: stabilityCheckCount, 
            hasIntruders: hasSplineIntruders 
        };
    }
    
    // 지속적 반발력 적용 함수
    function applyBoundaryRepulsion() {
        if (!repulsionSystemActive) return;
        
        calculateBoundaryRepulsion();
        
        // 안정화 상태 체크
        const stabilityInfo = checkStability();
        
        if (boundaryForces.size > 0) {
            const nodesToUpdate = {};
            let hasSignificantForces = false;
            
            boundaryForces.forEach((force, nodeId) => {
                // 드래그 중인 그룹의 노드는 반발력 적용 제외
                let skipNode = false;
                if (isDraggingGroup && draggedGroupKey) {
                    const draggedGroupNodes = valueCourseIds[draggedGroupKey] || [];
                    if (draggedGroupNodes.includes(nodeId)) {
                        skipNode = true;
                    }
                }
                
                if (!skipNode && (Math.abs(force.x) > 0.1 || Math.abs(force.y) > 0.1)) { // 임계값 낮춤 (더 민감한 반응)
                    hasSignificantForces = true;
                    try {
                        const currentPos = network.getPosition(nodeId);
                        if (currentPos) {
                            // 안정화 정도와 노드 위치에 따라 dampening 조정
                            let dampening = 0.18;
                            
                            // 스플라인 침입 노드들에게는 더 강한 dampening 적용
                            let isSplineIntruder = false;
                            valueKeys.forEach(groupKey => {
                                const groupBoundary = commonValuesBlobData[groupKey];
                                const groupNodeIds = valueCourseIds[groupKey] || [];
                                if (!groupNodeIds.includes(nodeId) && groupBoundary && isPointInPolygon(currentPos, groupBoundary)) {
                                    isSplineIntruder = true;
                                }
                            });
                            
                            if (isSplineIntruder) {
                                dampening = 0.5; // 스플라인 침입자는 매우 강한 dampening (0.25 → 0.5)
                            } else if (stabilityInfo.maxMovement < 1.0) {
                                dampening *= 0.9; // 거의 안정화되면 부드럽게 (0.8 → 0.9)
                            }
                            
                            nodesToUpdate[nodeId] = {
                                x: currentPos.x + force.x * dampening,
                                y: currentPos.y + force.y * dampening
                            };
                        }
                    } catch (error) {
                        // 노드 위치 가져오기 실패 시 무시
                    }
                }
            });
            
            // 안정화되었지만 여전히 반발력이 있으면 계속 적용
            if (hasSignificantForces || !stabilityInfo.isStable) {
                stabilityCheckCount = 0; // 반발력이 계속 있으면 안정화 카운터 리셋
            }
            
            // 배치로 노드 위치 업데이트
            Object.entries(nodesToUpdate).forEach(([nodeId, pos]) => {
                try {
                    network.moveNode(nodeId, pos.x, pos.y);
                } catch (error) {
                    // 노드 이동 실패 시 무시
                }
            });
            
            // 업데이트된 노드들의 스플라인 경계 재계산
            if (Object.keys(nodesToUpdate).length > 0) {
                setTimeout(() => {
                    valueKeys.forEach(key => {
                        const groupNodeIds = valueCourseIds[key] || [];
                        const hasUpdatedNodes = groupNodeIds.some(nodeId => nodesToUpdate[nodeId]);
                        if (hasUpdatedNodes) {
                            updateGroupBoundary(key);
                        }
                    });
                }, 10);
            }
            
            // 디버깅을 위한 로그
        } else if (stabilityInfo.isStable && stabilityInfo.checkCount >= 10) {
            // 완전히 안정화되었고 10번 이상 체크되었으면 주기를 늦춤 (성능 최적화)
            // 하지만 여전히 모니터링은 계속
        }
    }
    
    // 반발력 시스템 시작
    function startRepulsionSystem() {
        if (repulsionInterval) clearInterval(repulsionInterval);
        repulsionInterval = setInterval(applyBoundaryRepulsion, 80); // 80ms마다 실행 (12.5fps) - 부드러운 속도
        repulsionSystemActive = true;
    }
    
    // 반발력 시스템 중지
    function stopRepulsionSystem() {
        if (repulsionInterval) {
            clearInterval(repulsionInterval);
            repulsionInterval = null;
        }
    }

    // 제거된 침입 노드 추적 시스템
    let expelledNodes = new Set(); // 추방된 노드들 기록
    let nodeGroupExclusions = new Map(); // 노드별 제외된 그룹 목록

    // 스플라인 버텍스 포인트와 침입 노드 간 상호 반발력 적용 함수
    function applySplineVertexRepulsion(nodeId, nodePosition, groupKey, groupBoundary) {
        if (!groupBoundary || groupBoundary.length < 3) return 0;
        
        const splineVertexForce = 20; // 스플라인 버텍스 포인트의 반발력
        const vertexInfluenceRadius = 80; // 버텍스 포인트 영향 범위
        let totalVertexForce = 0;
        
        // 각 스플라인 버텍스 포인트와 침입 노드 간 반발력 계산
        groupBoundary.forEach(vertex => {
            const vertexX = vertex.x;
            const vertexY = vertex.y;
            
            // 버텍스 포인트와 노드 간 거리 계산
            const dx = nodePosition.x - vertexX;
            const dy = nodePosition.y - vertexY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // 영향 범위 내에 있는 경우만 반발력 적용
            if (distance < vertexInfluenceRadius && distance > 0) {
                const dirX = dx / distance;
                const dirY = dy / distance;
                
                // 거리에 반비례하는 반발력 (가까울수록 강함)
                const vertexForceMultiplier = Math.max(0.1, (vertexInfluenceRadius - distance) / vertexInfluenceRadius);
                const vertexRepulsionForce = splineVertexForce * vertexForceMultiplier * 0.008;
                
                // 노드에 반발력 적용
                const node = network.body.nodes[nodeId];
                if (node) {
                    node.vx = (node.vx || 0) + dirX * vertexRepulsionForce;
                    node.vy = (node.vy || 0) + dirY * vertexRepulsionForce;
                    totalVertexForce += vertexRepulsionForce;
                }
            }
        });
        
        return totalVertexForce;
    }

    // 지속적으로 부드럽게 노드들을 그룹 경계 밖으로 밀어내는 함수 (스플라인 버텍스 반발력 포함)
    function applyContinuousRepulsion() {
        if (!commonValuesBlobData || Object.keys(commonValuesBlobData).length === 0) {
            return false; // 처리할 데이터가 없음
        }

        // 그룹 드래그 중에는 침입 노드 검사 중단 (false positive 방지)
        if (isDraggingGroup) {
            return true; // 드래그 중이므로 검사 패스
        }

        const baseRepulsionForce = 80; // 기존 30 → 80으로 증가 (더 빠르게)
        const springK = 0.08; // 스프링 상수(조절 가능)
        const minDistanceFromBoundary = 600; // 경계에서 더 가까운 거리
        const boundaryOffset = 150; // 경계 확장 오프셋 (줄임)
        let totalForceApplied = 0;
        let detectedIntruders = [];
        
        // 물리 엔진의 각 노드에 연속적으로 부드러운 힘 적용
        Object.keys(network.body.nodes).forEach(nodeId => {
            const node = network.body.nodes[nodeId];
            if (!node) return;
            
            const nodePosition = { x: node.x, y: node.y };
            
            // 각 그룹에 대해 확인
            valueKeys.forEach(groupKey => {
                const groupNodeIds = valueCourseIds[groupKey];
                const groupBoundary = commonValuesBlobData[groupKey];
                
                if (!groupBoundary || groupBoundary.length < 3) return;
                
                const nodeInThisGroup = groupNodeIds && groupNodeIds.includes(nodeId);
                const expandedBoundary = createExpandedBoundary(groupBoundary, boundaryOffset);
                const nodeInsideExpandedBoundary = isPointInPolygon(nodePosition, expandedBoundary);
                const nodeInsideOriginalBoundary = isPointInPolygon(nodePosition, groupBoundary);
                
                // 추방된 노드의 재진입 방지 (강력한 연속 힘)
                if (expelledNodes.has(nodeId)) {
                    const exclusions = nodeGroupExclusions.get(nodeId);
                    if (exclusions && exclusions.has(groupKey) && nodeInsideExpandedBoundary) {
                        // 중심점 계산
                        let centerX = 0, centerY = 0;
                        expandedBoundary.forEach(point => {
                            centerX += point.x;
                            centerY += point.y;
                        });
                        centerX /= expandedBoundary.length;
                        centerY /= expandedBoundary.length;
                        
                        const dx = nodePosition.x - centerX;
                        const dy = nodePosition.y - centerY;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        
                        if (distance > 0) {
                            const dirX = dx / distance;
                            const dirY = dy / distance;
                            // spring force: F = -k * x (x: 경계 중심~노드 거리)
                            const springForce = springK * distance + baseRepulsionForce * 0.2;
                            node.vx = (node.vx || 0) + dirX * springForce;
                            node.vy = (node.vy || 0) + dirY * springForce;
                            totalForceApplied += springForce;
                            // 스플라인 버텍스 포인트와의 추가 반발력
                            const vertexForce = applySplineVertexRepulsion(nodeId, nodePosition, groupKey, groupBoundary);
                            totalForceApplied += vertexForce;
                        }
                        return;
                    }
                }
                // 그룹에 속하지 않지만 경계 내부에 있는 노드 처리 (새로운 침입자)
                if (!nodeInThisGroup && nodeInsideOriginalBoundary) {
                    const exclusions = nodeGroupExclusions.get(nodeId);
                    const isExcluded = exclusions && exclusions.has(groupKey);
                    let belongsToAnyGroup = false;
                    valueKeys.forEach(checkGroupKey => {
                        const checkGroupNodeIds = valueCourseIds[checkGroupKey];
                        if (checkGroupNodeIds && checkGroupNodeIds.includes(nodeId)) {
                            belongsToAnyGroup = true;
                        }
                    });
                    if (!belongsToAnyGroup && !isExcluded) {
                        detectedIntruders.push(nodeId);
                        // 중심점 계산
                        let centerX = 0, centerY = 0;
                        expandedBoundary.forEach(point => {
                            centerX += point.x;
                            centerY += point.y;
                        });
                        centerX /= expandedBoundary.length;
                        centerY /= expandedBoundary.length;
                        const dx = nodePosition.x - centerX;
                        const dy = nodePosition.y - centerY;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        if (distance > 0) {
                            const dirX = dx / distance;
                            const dirY = dy / distance;
                            // spring force: F = -k * x (x: 경계 중심~노드 거리)
                            const springForce = springK * distance + baseRepulsionForce * 0.8;
                            node.vx = (node.vx || 0) + dirX * springForce;
                            node.vy = (node.vy || 0) + dirY * springForce;
                            totalForceApplied += springForce;
                            // 스플라인 버텍스 포인트와의 추가 반발력
                            const vertexForce = applySplineVertexRepulsion(nodeId, nodePosition, groupKey, groupBoundary);
                            totalForceApplied += vertexForce;
                        }
                    }
                }
                // 경계 밖으로 완전히 나간 노드를 추방 목록에 추가 (더 신중한 처리)
                if (!nodeInThisGroup && !nodeInsideOriginalBoundary && !nodeInsideExpandedBoundary) {
                    if (detectedIntruders.includes(nodeId)) {
                        setTimeout(() => {
                            const currentNodePosition = network.getPosition(nodeId);
                            if (currentNodePosition && 
                                !isPointInPolygon(currentNodePosition, groupBoundary) &&
                                !isPointInPolygon(currentNodePosition, expandedBoundary)) {
                                if (!nodeGroupExclusions.has(nodeId)) {
                                    nodeGroupExclusions.set(nodeId, new Set());
                                }
                                nodeGroupExclusions.get(nodeId).add(groupKey);
                                expelledNodes.add(nodeId);
                            }
                        }, 800);
                    }
                }
            });
        });
        
        // 시각적 표시 업데이트
        const nodeUpdates = [];
        nodes.forEach(node => {
            const isIntruder = detectedIntruders.includes(node.id);
            const isExpelled = expelledNodes.has(node.id);
            
            if (isIntruder) {
                // 현재 침입 중인 노드 - 빨간 테두리
                nodeUpdates.push({
                    id: node.id,
                    color: {
                        ...node.color,
                        border: '#00ff3cff', // 빨간 테두리 (침입 중)
                        highlight: {
                            border: '#FF0000',
                            background: '#FFEEEE'
                        }
                    }
                });
            } else if (isExpelled) {
                // 추방된 노드 - 회색 테두리로 표시
                nodeUpdates.push({
                    id: node.id,
                    color: {
                        ...node.color,
                        border: '#888888', // 회색 테두리 (추방됨)
                        highlight: {
                            border: '#888888',
                            background: '#F5F5F5'
                        }
                    }
                });
            } else if (node.color && (node.color.border === '#FF0000' || node.color.border === '#888888')) {
                // 이전에 특별한 테두리였던 노드 복원
                nodeUpdates.push({
                    id: node.id,
                    color: {
                        ...node.color,
                        border: node.originalBorder || '#1d1d1dff'
                    }
                });
            }
        });
        
        if (nodeUpdates.length > 0) {
            try {
                network.body.data.nodes.update(nodeUpdates);
            } catch (error) {
            }
        }
        
        // 힘이 적용되었다면 물리 시뮬레이션 활성화
        if (totalForceApplied > 0 && network.physics) {
            if (!network.physics.options.enabled) {
                network.setOptions({
                    physics: {
                        enabled: true,
                        stabilization: false
                    }
                });
            }
        }
        
        return detectedIntruders.length === 0; // 모든 침입 노드가 제거되었는지 반환
    }

    // 경계 확장 함수 (오프셋 적용)
    function createExpandedBoundary(originalBoundary, offset) {
        if (!originalBoundary || originalBoundary.length < 3) {
            return originalBoundary;
        }

        // 폴리곤 중심점 계산
        let centerX = 0, centerY = 0;
        originalBoundary.forEach(point => {
            centerX += point.x;
            centerY += point.y;
        });
        centerX /= originalBoundary.length;
        centerY /= originalBoundary.length;

        // 각 점을 중심에서 바깥쪽으로 오프셋만큼 확장
        const expandedBoundary = originalBoundary.map(point => {
            const dx = point.x - centerX;
            const dy = point.y - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance === 0) {
                return { x: point.x, y: point.y };
            }
            
            // 정규화된 방향 벡터에 오프셋 적용
            const dirX = dx / distance;
            const dirY = dy / distance;
            
            return {
                x: point.x + dirX * offset,
                y: point.y + dirY * offset
            };
        });

        return expandedBoundary;
    }

    // 특정 그룹의 경계만 업데이트하는 함수
    function updateGroupBoundary(groupKey) {
        if (!groupKey || !valueCourseIds[groupKey]) return;
        
        const ids = valueCourseIds[groupKey];
        if (!ids.length) return;

        let outlinePoints = [];
        ids.forEach(id => {
            const position = network.getPosition(id);
            if (position) {
                const points = getNodeOutlinePoints(network, id, 15);
                outlinePoints = outlinePoints.concat(points);
            }
        });

        if (outlinePoints.length < 3) return;

        let hull = convexHull(outlinePoints);
        // 스플라인 버텍스 포인트 개수 증가
        hull = increaseSplineVertices(hull);
        for (let i = 0; i < 3; i++) hull = smoothHull(hull);
        commonValuesBlobData[groupKey] = hull;
        
        // requestAnimationFrame을 사용하여 부드러운 렌더링
        requestAnimationFrame(() => {
            network.redraw();
        });
    }

    // 침입 노드 수 카운팅 함수
    function countInvasionNodes() {
        if (!commonValuesBlobData || Object.keys(commonValuesBlobData).length === 0) {
            return 0;
        }

        let invasionCount = 0;
        
        Object.keys(network.body.nodes).forEach(nodeId => {
            const node = network.body.nodes[nodeId];
            if (!node) return;
            
            const nodePosition = { x: node.x, y: node.y };
            
            valueKeys.forEach(groupKey => {
                const groupNodeIds = valueCourseIds[groupKey];
                const groupBoundary = commonValuesBlobData[groupKey];
                
                if (!groupBoundary || groupBoundary.length < 3) return;
                
                const nodeInThisGroup = groupNodeIds.includes(nodeId);
                const nodeInsideBoundary = isPointInPolygon(nodePosition, groupBoundary);
                
                // 이미 이 그룹에서 추방된 노드인지 확인
                const exclusions = nodeGroupExclusions.get(nodeId);
                const isExcluded = exclusions && exclusions.has(groupKey);
                
                if (!nodeInThisGroup && nodeInsideBoundary && !isExcluded) {
                    invasionCount++;
                }
            });
        });
        
        return invasionCount;
    }

    // 추방 기록 초기화 함수 (필요시 사용)
    function resetExpulsionHistory() {
        expelledNodes.clear();
        nodeGroupExclusions.clear();
    }

    // 특정 노드의 추방 기록 제거 (노드가 다른 그룹으로 이동했을 때)
    function clearNodeExpulsion(nodeId) {
        expelledNodes.delete(nodeId);
        nodeGroupExclusions.delete(nodeId);
    }

    // 그룹별 색상 (테두리용 진한 색상)
    const groupColors = {
        value1: '#1976d2', // 진한 파랑
        value2: '#d81b60', // 진한 핑크  
        value3: '#388e3c', // 진한 녹색
    };

    // 배경용 연한 색상
    const groupBgColors = {
        value1: 'rgba(33,150,243,0.08)',
        value2: 'rgba(233,30,99,0.08)', 
        value3: 'rgba(56,142,60,0.16)', // 녹색 배경
    };

    // blob 형태의 부드러운 커브 영역 그리기 함수
    function drawBlobCurve(ctx, points) {
        if (!points || points.length < 3) return;
        
        ctx.beginPath();
        
        // 첫 번째 점으로 이동
        ctx.moveTo(points[0].x, points[0].y);
        
        // blob 형태의 부드러운 곡선 그리기
        for (let i = 0; i < points.length; i++) {
            const current = points[i];
            const next = points[(i + 1) % points.length];
            const nextNext = points[(i + 2) % points.length];
            
            // 현재 점과 다음 점 사이의 중간점 계산
            const midX = (current.x + next.x) / 2;
            const midY = (current.y + next.y) / 2;
            
            // 제어점 계산 (blob 형태를 위한 부드러운 곡선)
            const controlX = midX + (next.y - current.y) * 0.3;
            const controlY = midY - (next.x - current.x) * 0.3;
            
            // 다음 중간점 계산
            const nextMidX = (next.x + nextNext.x) / 2;
            const nextMidY = (next.y + nextNext.y) / 2;
            
            // 부드러운 blob 곡선 그리기
            ctx.quadraticCurveTo(controlX, controlY, nextMidX, nextMidY);
        }
        
        // 닫힌 blob 형태 완성
        ctx.closePath();
    }

    // 컨벡스 헐 계산 함수(Andrew's monotone chain)
    function convexHull(points) {
        points = points.slice().sort((a, b) => a.x - b.x || a.y - b.y);
        const lower = [];
        for (let p of points) {
            while (lower.length >= 2 && cross(lower[lower.length-2], lower[lower.length-1], p) <= 0) lower.pop();
            lower.push(p);
        }
        const upper = [];
        for (let i = points.length - 1; i >= 0; i--) {
            const p = points[i];
            while (upper.length >= 2 && cross(upper[upper.length-2], upper[upper.length-1], p) <= 0) upper.pop();
            upper.push(p);
        }
        upper.pop();
        lower.pop();
        return lower.concat(upper);
        function cross(a, b, c) {
            return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
        }
    }

    function smoothHull(hull) {
        if (!hull || hull.length < 3) return hull;
        const smoothed = [];
        const len = hull.length;
        const smoothingFactor = 0.4;
        for (let i = 0; i < len; i++) {
            const prev = hull[(i - 1 + len) % len];
            const current = hull[i];
            const next = hull[(i + 1) % len];
            const smoothedX = current.x * (1 - smoothingFactor) + (prev.x + next.x) * smoothingFactor / 2;
            const smoothedY = current.y * (1 - smoothingFactor) + (prev.y + next.y) * smoothingFactor / 2;
            smoothed.push({ x: smoothedX, y: smoothedY });
        }
        return smoothed;
    }

    // 스플라인 버텍스 포인트 개수 증가 함수 (세밀화)
    function increaseSplineVertices(hull) {
        if (!hull || hull.length < 3) return hull;
        
        const increased = [];
        const len = hull.length;
        
        for (let i = 0; i < len; i++) {
            const current = hull[i];
            const next = hull[(i + 1) % len];
            
            // 현재 점 추가
            increased.push(current);
            
            // 현재 점과 다음 점 사이에 2개의 추가 점 삽입
            const dx = next.x - current.x;
            const dy = next.y - current.y;
            
            // 첫 번째 중간점 (1/3 지점)
            increased.push({
                x: current.x + dx * 0.33,
                y: current.y + dy * 0.33
            });
            
            // 두 번째 중간점 (2/3 지점)
            increased.push({
                x: current.x + dx * 0.67,
                y: current.y + dy * 0.67
            });
        }
        
        return increased;
    }

    // 스플라인 버텍스 포인트들을 물리 시뮬레이션 노드로 변환
    function getSplineVertexNodes(groupKey) {
        if (!commonValuesBlobData[groupKey]) return [];
        
        const splinePoints = commonValuesBlobData[groupKey];
        const vertexNodes = [];
        
        splinePoints.forEach((point, index) => {
            vertexNodes.push({
                id: `spline_vertex_${groupKey}_${index}`,
                x: point.x,
                y: point.y,
                groupKey: groupKey,
                type: 'spline_vertex',
                mass: 0.5, // 가벼운 질량으로 설정
                fixed: false // 움직일 수 있도록 설정
            });
        });
        
        return vertexNodes;
    }
    function drawSmoothCurve(ctx, points) {
        if (!points || points.length < 3) return;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 0; i < points.length; i++) {
            const p0 = points[(i - 1 + points.length) % points.length];
            const p1 = points[i];
            const p2 = points[(i + 1) % points.length];
            const p3 = points[(i + 2) % points.length];
            // Catmull-Rom to Bezier 변환
            const cp1x = p1.x + (p2.x - p0.x) / 6;
            const cp1y = p1.y + (p2.y - p0.y) / 6;
            const cp2x = p2.x - (p3.x - p1.x) / 6;
            const cp2y = p2.y - (p3.y - p1.y) / 6;
            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
        }
        ctx.closePath();
    }

// ... 기존 코드 ...
    // 노드 외곽점 샘플링 함수 (더 부드러운 스플라인을 위해 더 많은 점 생성)
    // 그룹별로 겹침을 최소화하기 위해 offset을 더 크게 적용
    function getNodeOutlinePoints(network, nodeId, offset = 48) {
        const pos = network.getPosition(nodeId);
        const node = network.body.nodes[nodeId];
        if (!pos || !node) return [];
        const width = (node.shapeObj && node.shapeObj.width) || 60;
        const height = (node.shapeObj && node.shapeObj.height) || 30;

        // 네 모서리 좌표
        const corners = [
            { x: pos.x - width / 2, y: pos.y - height / 2 },
            { x: pos.x + width / 2, y: pos.y - height / 2 },
            { x: pos.x + width / 2, y: pos.y + height / 2 },
            { x: pos.x - width / 2, y: pos.y + height / 2 }
        ];
        // 박스의 중간점(상, 하, 좌, 우)
        const mids = [
            { x: pos.x, y: pos.y - height / 2 },
            { x: pos.x + width / 2, y: pos.y },
            { x: pos.x, y: pos.y + height / 2 },
            { x: pos.x - width / 2, y: pos.y }
        ];

        // 각 꼭지점과 중간점을 박스 중심에서 offset만큼 이동
        const allPoints = corners.concat(mids).map(pt => {
            const dx = pt.x - pos.x;
            const dy = pt.y - pos.y;
            const length = Math.sqrt(dx * dx + dy * dy) || 1;
            return {
                x: pt.x + (dx / length) * offset,
                y: pt.y + (dy / length) * offset
            };
        });
        return allPoints;
    }

    // 전역 변수 사용 (상태 유지)
    
    // 네트워크가 그려진 후 그룹 blob을 그림
    network.on('beforeDrawing', function(ctx) {
        // 1. blob 영역 먼저 그림 (노드/엣지 아래)
        valueKeys.forEach(key => {
            const ids = valueCourseIds[key];
            if (!ids.length) {
                return;
            }
            let outlinePoints = [];
            ids.forEach(id => {
                const points = getNodeOutlinePoints(network, id, 100); // offset을 크게 적용
                outlinePoints = outlinePoints.concat(points);
            });
            
            outlinePoints.forEach((pt, idx) => {
                
            });
            
            if (outlinePoints.length < 3) {
                return;
            }
            let hull = convexHull(outlinePoints);
            // 스플라인 버텍스 포인트 개수 증가
            hull = increaseSplineVertices(hull);
            // 더 부드러운 스플라인을 위해 스무싱 활성화
            for (let i = 0; i < 3; i++) hull = smoothHull(hull); // smoothing 3회
            commonValuesBlobData[key] = hull;
            
            // blob 색상 및 강조 효과 개선
            ctx.save();
            
            // 선택/호버 상태에 따른 투명도 설정
            let alpha = 0.56; // 기본
            if (selectedCommonValuesBlob === key) {
                alpha = 0.82; // 선택됨
            } else if (hoveredBlob === key) {
                alpha = 0.7; // 호버됨
            }
            ctx.globalAlpha = alpha;
            ctx.fillStyle = groupBgColors[key] || 'rgba(33,150,243,0.16)';

            // 선택/호버 상태에 따른 테두리 설정
            const strokeColor = groupColors[key] || '#666';
            ctx.strokeStyle = strokeColor;
            let lineWidth = 2; // 기본
            if (selectedCommonValuesBlob === key) {
                lineWidth = 4; // 선택됨
            } else if (hoveredBlob === key) {
                lineWidth = 3; // 호버됨
            }
            ctx.lineWidth = lineWidth;
            // 점선 제거
            // ctx.setLineDash([6, 2]); // 점선 패턴 제거
            drawSmoothCurve(ctx, hull);
            ctx.fill();
            ctx.stroke();
            // ctx.setLineDash([]); // 점선 패턴 초기화 제거
            ctx.restore();

            
            // 그룹명 라벨 표시 (중앙)
            if (ids.length > 0) {
                // 중앙점 계산
                let centerX = 0, centerY = 0;
                ids.forEach(id => {
                    const pos = network.getPosition(id);
                    centerX += pos.x; centerY += pos.y;
                });
                centerX /= ids.length; centerY /= ids.length;
                ctx.save();
                ctx.globalAlpha = 1;
                // 선택/호버 상태에 따른 폰트 스타일 설정
                ctx.font = 'bold 26px Noto Sans KR, sans-serif';
                
                let textColor;
                if (selectedCommonValuesBlob === key) {
                    textColor = groupColors[key] || '#333'; // 선택됨
                } else if (hoveredBlob === key) {
                    textColor = 'rgba(85, 85, 85, 0.8)'; // 호버됨
                } else {
                    textColor = 'rgba(127, 127, 127, 0.29)'; // 기본 (회색)
                }
                ctx.fillStyle = textColor;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 5;
                const groupLabel = commonValuesGroupNames[key] || key;
                
                // 라벨 텍스트 크기 측정 및 위치 저장
                const textMetrics = ctx.measureText(groupLabel);
                const labelWidth = textMetrics.width;
                const labelHeight = 24; // 폰트 크기 기준 추정
                groupLabelPositions.set(key, {
                    x: centerX,
                    y: centerY,
                    width: labelWidth,
                    height: labelHeight
                });
                
                ctx.strokeText(groupLabel, centerX, centerY);
                ctx.fillText(groupLabel, centerX, centerY);
                ctx.restore();
            }
        });
    });

    // 점이 폴리곤 내부에 있는지 확인하는 함수
    function isPointInPolygon(point, polygon) {
        if (!point || !polygon || polygon.length < 3) {
            return false;
        }
        
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            if (((polygon[i].y > point.y) !== (polygon[j].y > point.y)) &&
                (point.x < (polygon[j].x - polygon[i].x) * (point.y - polygon[i].y) / (polygon[j].y - polygon[i].y) + polygon[i].x)) {
                inside = !inside;
            }
        }
        return inside;
    }

    // 그룹 드래그 관련 변수
    let isDraggingGroup = false;
    let draggedGroupKey = null;
    let dragStartPosition = null;
    let groupOriginalPositions = {};

    // blob 커브 클릭 및 드래그 이벤트 처리
    network.on('click', function(params) {
        // 노드 클릭 시 스플라인 선택 해제
        if (params.nodes.length > 0) {
            if (selectedCommonValuesBlob) {
                selectedCommonValuesBlob = null;
                updateNodeHighlight();
                network.redraw();
            }
            return;
        }
        
        // 그룹 폴리곤 클릭 시 선택/선택해제, 빈 영역 클릭 시 선택 해제
        if (params.nodes.length === 0) {
            const canvasPosition = params.pointer.canvas;
            
            let clickedBlob = null;
            for (const key of valueKeys) {
                if (commonValuesBlobData[key] && isPointInPolygon(canvasPosition, commonValuesBlobData[key])) {
                    clickedBlob = key;
                    break;
                }
            }
            
            if (clickedBlob) {
                // 같은 그룹 클릭 시 선택해제, 다른 그룹 클릭 시 선택 변경
                selectedCommonValuesBlob = selectedCommonValuesBlob === clickedBlob ? null : clickedBlob;
                updateNodeHighlight();
                network.redraw();
            } else {
                // 빈 영역 클릭 시 선택 해제
                if (selectedCommonValuesBlob) {
                    selectedCommonValuesBlob = null;
                    updateNodeHighlight();
                    network.redraw();
                }
            }
        }
    });

    // 마우스 호버 시 스플라인 하이라이트
    let hoveredBlob = null;
    network.on('hoverNode', function(params) {
        // 노드 호버 시에는 스플라인 호버 해제
        if (hoveredBlob) {
            hoveredBlob = null;
            network.redraw();
        }
    });
    
    // 직접 마우스 이벤트로 드래그 처리
    let isMouseDown = false;
    let mouseDownPosition = null;
    
    container.addEventListener('mousedown', function(event) {
        // 좌클릭만 처리
        if (event.button !== 0) return;
        
        const rect = container.getBoundingClientRect();
        const canvasPosition = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
        
        // 해당 위치의 노드 확인 - 노드가 있으면 스플라인 드래그 방지
        const nodeAtPosition = network.getNodeAt(canvasPosition);
        if (nodeAtPosition) {
            return;
        }
        
        // vis.js 캔버스 좌표계로 직접 변환
        const canvasPos = network.DOMtoCanvas(canvasPosition);
        
        // 폴리곤 내부 클릭 확인
        for (const key of valueKeys) {
            if (commonValuesBlobData[key] && isPointInPolygon(canvasPos, commonValuesBlobData[key])) {
                isMouseDown = true;
                mouseDownPosition = canvasPos;
                isDraggingGroup = true;
                draggedGroupKey = key;
                dragStartPosition = canvasPos;
                
                // 그룹 내 노드들의 원래 위치 저장
                groupOriginalPositions = {};
                const groupNodeIds = valueCourseIds[key];
                
                if (groupNodeIds && groupNodeIds.length > 0) {
                    groupNodeIds.forEach(nodeId => {
                        const nodePosition = network.getPosition(nodeId);
                        if (nodePosition && typeof nodePosition.x === 'number' && typeof nodePosition.y === 'number') {
                            groupOriginalPositions[nodeId] = { x: nodePosition.x, y: nodePosition.y };
                        }
                    });
                }
                
                // 물리 시뮬레이션과 상호작용 비활성화, 반발력 시스템 일시 정지
                network.setOptions({
                    physics: { enabled: false },
                    interaction: {
                        dragNodes: false,
                        dragView: false
                    }
                });
                
                // 그룹 드래그 중에도 반발력 시스템 계속 작동
                
                container.style.cursor = 'grabbing';
                selectedCommonValuesBlob = key;
                updateNodeHighlight();
                
                event.preventDefault();
                break;
            }
        }
    });

    // 마우스 이동 이벤트 (호버 + 드래그)
    container.addEventListener('mousemove', function(event) {
        const rect = container.getBoundingClientRect();
        const canvasPosition = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
        
        // vis.js 캔버스 좌표계로 직접 변환
        const canvasPos = network.DOMtoCanvas(canvasPosition);
        
        // 드래그 중인 경우
        if (isDraggingGroup && draggedGroupKey && dragStartPosition) {
            const deltaX = canvasPos.x - dragStartPosition.x;
            const deltaY = canvasPos.y - dragStartPosition.y;
            
            // 그룹 내 모든 노드들을 같이 이동 (배치 처리)
            const groupNodeIds = valueCourseIds[draggedGroupKey];
            
            if (groupNodeIds && groupNodeIds.length > 0) {
                const updatePositions = {};
                
                groupNodeIds.forEach(nodeId => {
                    const originalPos = groupOriginalPositions[nodeId];
                    if (originalPos) {
                        const newX = originalPos.x + deltaX;
                        const newY = originalPos.y + deltaY;
                        updatePositions[nodeId] = { x: newX, y: newY };
                    }
                });
                
                // 한 번에 모든 노드 위치 업데이트
                try {
                    Object.entries(updatePositions).forEach(([nodeId, pos]) => {
                        network.moveNode(nodeId, pos.x, pos.y);
                    });
                } catch (error) {
                    // 노드 이동 실패 시 무시
                }
                
                // 실시간 폴리곤 업데이트 (throttled)
                if (!window.dragUpdateTimer) {
                    window.dragUpdateTimer = setTimeout(() => {
                        updateGroupBoundary(draggedGroupKey);
                        window.dragUpdateTimer = null;
                    }, 16); // ~60fps
                }
            }
        }
        // 호버 감지 (드래그 중이 아닐 때만)
        else {
            // 노드가 있는 위치는 호버하지 않음
            const nodeAtPosition = network.getNodeAt(canvasPosition);
            let newHoveredBlob = null;
            
            if (!nodeAtPosition) {
                for (const key of valueKeys) {
                    if (commonValuesBlobData[key] && isPointInPolygon(canvasPos, commonValuesBlobData[key])) {
                        newHoveredBlob = key;
                        break;
                    }
                }
            }
            
            // 호버 상태가 변경된 경우에만 다시 그리기
            if (hoveredBlob !== newHoveredBlob) {
                hoveredBlob = newHoveredBlob;
                
                // 커서 스타일 변경
                if (!isDraggingGroup) {
                    container.style.cursor = hoveredBlob ? 'pointer' : 'default';
                }
                
                network.redraw();
            }
        }
    });
    
    // 마우스 업 이벤트 (드래그 종료)
    container.addEventListener('mouseup', function(event) {
        if (isDraggingGroup) {
            
            const currentGroupKey = draggedGroupKey;
            
            // 타이머 정리
            if (window.dragUpdateTimer) {
                clearTimeout(window.dragUpdateTimer);
                window.dragUpdateTimer = null;
            }
            
            isDraggingGroup = false;
            draggedGroupKey = null;
            dragStartPosition = null;
            groupOriginalPositions = {};
            isMouseDown = false;
            mouseDownPosition = null;
            
            // 물리 시뮬레이션과 상호작용 재활성화, 반발력 시스템 재시작
            network.setOptions({
                physics: { enabled: true },
                interaction: {
                    dragNodes: true,
                    dragView: true
                }
            });
            
            // 반발력 시스템 상태 확인 (이미 활성화되어 있어야 함)
            repulsionSystemActive = true;
            
            // 커서 복원
            container.style.cursor = hoveredBlob ? 'pointer' : 'default';
            
            // 최종 그룹 경계 재계산
            if (currentGroupKey) {
                updateGroupBoundary(currentGroupKey);
                
                // 다른 그룹들도 업데이트
                setTimeout(() => {
                    Object.keys(valueCourseIds).forEach(key => {
                        if (key !== currentGroupKey) {
                            updateGroupBoundary(key);
                        }
                    });
                }, 100);
            }
        }
    });
    
    // 전역 mouseup 이벤트 (마우스가 컨테이너 밖으로 나가도 드래그 종료)
    document.addEventListener('mouseup', function(event) {
        if (isDraggingGroup) {
            container.dispatchEvent(new MouseEvent('mouseup', event));
        }
    });

    // 그룹 드래그 시작 (레거시 - 사용되지 않음)
    network.on('dragStart', function(params) {
        // 현재 직접 마우스 이벤트로 처리되고 있어 사용되지 않음
    });

    // 그룹 드래그 중
    network.on('dragging', function(params) {
        if (isDraggingGroup && draggedGroupKey && dragStartPosition) {
            const currentPosition = params.pointer.canvas;
            const deltaX = currentPosition.x - dragStartPosition.x;
            const deltaY = currentPosition.y - dragStartPosition.y;
            
            // 그룹 내 모든 노드들을 같이 이동
            const groupNodeIds = valueCourseIds[draggedGroupKey];
            
            if (groupNodeIds && groupNodeIds.length > 0) {
                // 배치로 노드 위치 업데이트 (성능 개선)
                const updatePositions = {};
                groupNodeIds.forEach(nodeId => {
                    const originalPos = groupOriginalPositions[nodeId];
                    if (originalPos) {
                        const newX = originalPos.x + deltaX;
                        const newY = originalPos.y + deltaY;
                        updatePositions[nodeId] = { x: newX, y: newY };
                    }
                });
                
                // 한 번에 모든 노드 위치 업데이트
                try {
                    network.moveNode(Object.keys(updatePositions), Object.values(updatePositions));
                } catch (error) {
                    // 개별 노드 업데이트 방식으로 폴백
                    Object.entries(updatePositions).forEach(([nodeId, pos]) => {
                        try {
                            network.moveNode(nodeId, pos.x, pos.y);
                        } catch (e) {
                            // 노드가 존재하지 않는 경우 무시
                        }
                    });
                }
                
                // 실시간 폴리곤 업데이트 (throttle 적용)
                if (!window.dragUpdateTimer) {
                    window.dragUpdateTimer = setTimeout(() => {
                        updateGroupBoundary(draggedGroupKey);
                        window.dragUpdateTimer = null;
                    }, 16); // ~60fps
                }
            }
        }
    });

    // 그룹 드래그 종료
    network.on('dragEnd', function(params) {
        if (isDraggingGroup) {
            const currentGroupKey = draggedGroupKey; // 현재 그룹키 저장
            
            // 타이머 정리
            if (window.dragUpdateTimer) {
                clearTimeout(window.dragUpdateTimer);
                window.dragUpdateTimer = null;
            }
            
            isDraggingGroup = false;
            draggedGroupKey = null;
            dragStartPosition = null;
            groupOriginalPositions = {};
            
            // 그룹 스플라인 드래그 완료 시 모든 인터랙션 재활성화
            network.setOptions({
                interaction: {
                    dragView: true, // 캔버스 드래그 재활성화
                    dragNodes: true // 개별 노드 드래그 재활성화
                },
                physics: {
                    enabled: true // 물리 시뮬레이션 재활성화
                }
            });
            
            // 드래그 완료 시 커서 원래대로 복원
            container.style.cursor = hoveredBlob ? 'pointer' : 'default';
            
            // 최종 그룹 경계 재계산 (즉시 실행)
            if (currentGroupKey) {
                updateGroupBoundary(currentGroupKey);
                
                // 다른 그룹들도 업데이트 (겹침 확인을 위해)
                setTimeout(() => {
                    Object.keys(valueCourseIds).forEach(key => {
                        if (key !== currentGroupKey) {
                            updateGroupBoundary(key);
                        }
                    });
                }, 100);
            }
            
        }
    });
    
    // 노드 하이라이트 업데이트 함수
    function updateNodeHighlight() {
        const nodeUpdate = [];
        nodes.forEach(node => {
            const nodeId = node.id;
            let isInSelectedGroup = false;
            if (selectedCommonValuesBlob && valueCourseIds[selectedCommonValuesBlob]) {
                isInSelectedGroup = valueCourseIds[selectedCommonValuesBlob].includes(nodeId);
            }
            const updatedNode = { ...node };
            if (selectedCommonValuesBlob) {
                if (isInSelectedGroup) {
                    // 하이라이트되는 노드의 테두리를 그룹 색상으로
                    const groupColor = {
                        value1: '#1976d2',
                        value2: '#d81b60',
                        value3: '#388e3c'
                    }[selectedCommonValuesBlob] || '#1d1d1dff';
                    updatedNode.color = {
                        ...updatedNode.color,
                        border: groupColor
                    };
                }
            }
            nodeUpdate.push(updatedNode);
        });
        // 노드 스타일만 update()로 적용 (네트워크 전체 재생성/물리효과 X)
        try {
            network.body.data.nodes.update(nodeUpdate);
        } catch (error) {
        }
    }
    
    // 마우스 노드 호버 효과 (간단한 방식)
    network.on('hoverNode', function(params) {
        // 호버된 노드만 하이라이트
        const nodeId = params.node;
        network.selectNodes([nodeId]);
        document.body.style.cursor = 'pointer';
    });

    network.on('blurNode', function(params) {
        network.unselectAll();
        document.body.style.cursor = 'default';
    });

    // 엣지(화살표) 위에 마우스 올릴 때 해당 yearSemester의 모든 노드 하이라이트
    network.on('hoverEdge', function(params) {
        const edgeId = params.edge;
        const edge = network.body.data.edges.get(edgeId);
        if (edge && edge.title) {
            // yearSemester 텍스트가 title에 있음
            const yearSemester = edge.title;
            // 해당 yearSemester의 모든 노드 id 찾기
            const highlightNodeIds = [];
            nodes.forEach(n => {
                const course = courses.find(c => c.id === n.id);
                if (course && course.yearSemester === yearSemester) {
                    highlightNodeIds.push(n.id);
                }
            });
            network.selectNodes(highlightNodeIds);
        }
        document.body.style.cursor = 'pointer';
    });

    network.on('blurEdge', function(params) {
        network.unselectAll();
        document.body.style.cursor = 'default';
    });
}
// ... existing code ...

// 공통가치대응 탭 활성화 시 네트워크 그래프 렌더링
const originalShowTab = window.showTab;
window.showTab = function(tabName, event) {
    originalShowTab.apply(this, arguments);
    if (tabName === 'commonValues') {
        renderCommonValuesNetworkGraph();
    } else {
        const container = document.getElementById('commonValuesNetworkGraph');
        if (container) container.style.display = 'none';
    }
};

// 공통가치대응 드래그 오버/드롭 이벤트 (curriculum과 유사하게)
function handleCommonValuesDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}
function handleCommonValuesDrop(e) {
    e.preventDefault();
    // 수정모드가 아닐 때는 무시
    const editModeButton = document.getElementById('editModeToggleCommonValues');
    const isEditMode = editModeButton && editModeButton.classList.contains('active');
    if (!isEditMode) return;

    const courseName = e.dataTransfer.getData('text/plain');
    const sourceCell = e.dataTransfer.getData('sourceCell');
    const course = courses.find(c => c.courseName === courseName);
    if (!course) return;

    // td의 id에서 subjectType, isRequired 추출
    let td = e.target.closest('td');
    if (!td || !td.id.startsWith('commonValues-cell-')) return;
    // id 예시: commonValues-cell-설계-필수, commonValues-cell-설계-선택, ...
    const idParts = td.id.replace('commonValues-cell-', '').split('-');
    const subjectType = idParts[0];
    const isRequired = idParts[1] === '필수';
    const valueColumn = idParts[1] && idParts[1].startsWith('value');

    // VALUE1,2,3 컬럼에 드롭하는 경우 복사 동작
    if (idParts[1] && idParts[1].startsWith('value')) {
        // VALUE1,2,3 컬럼인 경우 특별 처리
        const targetColumn = idParts[1]; // value1, value2, value3
        
        // 해당 열의 복사된 블럭 배열 업데이트
        if (!commonValuesCopiedBlocks[subjectType]) {
            commonValuesCopiedBlocks[subjectType] = {};
        }
        if (!commonValuesCopiedBlocks[subjectType][targetColumn]) {
            commonValuesCopiedBlocks[subjectType][targetColumn] = [];
        }
        
        // 중복 확인 후 추가
        if (!commonValuesCopiedBlocks[subjectType][targetColumn].includes(course.id)) {
            commonValuesCopiedBlocks[subjectType][targetColumn].push(course.id);
        }
        
        // 변경 기록 추가
        addChangeRecord('commonValues', `${subjectType}-${targetColumn}`, `${course.courseName} 블럭이 복사되었습니다.`);
        
        // 드래그가 완전히 종료된 후 렌더링
        setTimeout(() => {
            renderCommonValuesTable();
        }, 50);
        return;
    }

    // 기존 로직 (필수/선택 컬럼)
    if (isRequired || idParts[1] === '선택') {
        // 소스가 value 컬럼인 경우 복사 동작, 아니면 이동 동작
        if (sourceCell && sourceCell.includes('-value')) {
            // value 컬럼에서 전공필수/선택으로 드래그한 경우는 복사
            course.subjectType = subjectType;
            course.isRequired = isRequired ? '필수' : '선택';
        } else {
            // 전공필수/선택 간의 이동은 기존 동작 유지
            course.subjectType = subjectType;
            course.isRequired = isRequired ? '필수' : '선택';
        }
        
        // 변경 기록 추가
        addChangeRecord('commonValues', `${subjectType}-${isRequired ? '필수' : '선택'}`, `${course.courseName}이(가) ${subjectType} ${isRequired ? '필수' : '선택'}(으)로 분류되었습니다.`);
        
        // 드래그가 완전히 종료된 후 렌더링
        setTimeout(() => {
            renderCommonValuesTable();
        }, 50);
    }
}

// 공통가치대응 수정모드 상태 변수 (전역에서 이미 선언됨)

// 공통가치대응 수정모드 토글 함수
function toggleEditModeCommonValues() {
    isEditModeCommonValues = !isEditModeCommonValues;
    const btn = document.getElementById('editModeToggleCommonValues');
    const text = document.getElementById('editModeTextCommonValues');
    if (btn && text) {
        if (isEditModeCommonValues) {
            btn.classList.add('active');
            text.textContent = '수정모드';
            // 수정모드에서 제목 편집 가능하게 설정
            setCommonValuesTitleEditable(true);
        } else {
            btn.classList.remove('active');
            text.textContent = '일반모드';
            // 일반모드에서 제목 편집 비활성화
            setCommonValuesTitleEditable(false);
        }
    }
    
    // 셀 편집 중이 아닐 때만 테이블 재렌더링
    if (!isCommonValuesCellEditing) {
    // 테이블 재렌더링(드래그 가능 여부 반영)
    renderCommonValuesTable();
    }
    // 모든 교과목 블럭의 드래그 가능 여부 업데이트
    updateCommonValuesCourseBlocksDraggable();
}

// 과목분류별 배지 클래스 반환
function getSubjectTypeClass(subjectType) {
    switch(subjectType) {
        case '미분류': return 'type-unclassified';
        case '설계': return 'type-design';
        case '디지털': return 'type-digital';
        case '역사': return 'type-history';
        case '이론': return 'type-theory';
        case '도시': return 'type-urban';
        case '사회': return 'type-social';
        case '기술': return 'type-tech';
        case '실무': return 'type-practice';
        case '비교과': return 'type-extracurricular';
        default: return 'type-default';
    }
}

// 공통가치대응 교과목 블록의 드래그 가능 여부 업데이트
function updateCommonValuesCourseBlocksDraggable() {
    // 공통가치대응 탭의 수정모드 상태 변수 사용
    const isEditMode = isEditModeCommonValues;
    
    // 공통가치대응 테이블 내의 모든 교과목 블록
    const commonValuesBlocks = document.querySelectorAll('#commonValuesTable .course-block');
    commonValuesBlocks.forEach(block => {
        block.draggable = isEditMode;
    });
    
    // 미분류 테이블 내의 모든 교과목 블록
    const unclassifiedBlocks = document.querySelectorAll('#unclassifiedTable .course-block');
    unclassifiedBlocks.forEach(block => {
        block.draggable = isEditMode;
    });
    
    // 배치되지 않은 교과목 블럭들
    const unassignedBlocks = document.querySelectorAll('#commonValuesUnassignedBlocks .course-block');
    unassignedBlocks.forEach(block => {
        block.draggable = isEditMode;
    });
}

// 색상 기준 전환 상태 변수 (true: 과목분류, false: 구분)
let colorModeBySubjectType = true;

// 색상 기준 전환 함수
function toggleColorMode() {
    colorModeBySubjectType = !colorModeBySubjectType;
    const slider = document.getElementById('toggleSlider');
    const text = document.getElementById('colorModeText');
    
    if (slider && text) {
        if (colorModeBySubjectType) {
            // 과목분류 모드: 슬라이더를 왼쪽으로, 회색
            slider.style.left = '3px';
            slider.style.background = '#6c757d';
            text.textContent = '분야';
        } else {
            // 구분 모드: 슬라이더를 오른쪽으로, 녹색
            slider.style.left = '51px';
            slider.style.background = '#28a745';
            text.textContent = '구분';
        }
    }
    
    // 색상 범례 업데이트
    updateColorLegendCommonValues();
    
    // 공통가치대응 탭이 활성화된 경우에만 테이블 재렌더링
    const commonValuesTab = document.getElementById('commonValues');
    if (commonValuesTab && commonValuesTab.classList.contains('active')) {
        // 셀 편집 중이 아닐 때만 테이블 재렌더링
        if (!isCommonValuesCellEditing) {
        renderCommonValuesTable();
        }
        
        // 네트워크 그래프도 함께 업데이트
        if (typeof renderCommonValuesNetworkGraph === 'function') {
            renderCommonValuesNetworkGraph();
        }
    }
    
    // 이수모형 탭도 함께 갱신 (동기화)
    const curriculumTab = document.getElementById('curriculum');
    if (curriculumTab && curriculumTab.classList.contains('active')) {
        renderCurriculumTable();
    }
}

// 색상 기준 전환 상태 변수 (true: 과목분류, false: 구분)
let colorModeBySubjectTypeCurriculum = true;

// 색상 기준 전환 함수 (이수모형 탭용)
function toggleColorModeCurriculum() {
    colorModeBySubjectTypeCurriculum = !colorModeBySubjectTypeCurriculum;
    const slider = document.getElementById('toggleSliderCurriculum');
    const text = document.getElementById('colorModeTextCurriculum');
    
    if (slider && text) {
        if (colorModeBySubjectTypeCurriculum) {
            // 과목분류 모드: 슬라이더를 왼쪽으로, 회색
            slider.style.left = '3px';
            slider.style.background = '#6c757d';
            text.textContent = '분야';
        } else {
            // 구분 모드: 슬라이더를 오른쪽으로, 녹색
            slider.style.left = '51px';
            slider.style.background = '#28a745';
            text.textContent = '구분';
        }
    }
    
    // 색상 범례 업데이트
    updateColorLegendCurriculum();
    
    // 이수모형 탭이 활성화된 경우에만 테이블 재렌더링
    const curriculumTab = document.getElementById('curriculum');
    if (curriculumTab && curriculumTab.classList.contains('active')) {
        renderCurriculumTable();
    }
    
    // 공통가치대응 탭도 함께 갱신 (동기화)
    const commonValuesTab = document.getElementById('commonValues');
    if (commonValuesTab && commonValuesTab.classList.contains('active')) {
        // 셀 편집 중이 아닐 때만 테이블 재렌더링
        if (!isCommonValuesCellEditing) {
        renderCommonValuesTable();
        
        }
    }

    // 공통가치대응 탭의 네트워크 그래프도 함께 갱신
    if (typeof renderCommonValuesNetworkGraph === 'function') {
        const commonValuesTab = document.getElementById('commonValues');
        if (commonValuesTab && commonValuesTab.classList.contains('active')) {
            renderCommonValuesNetworkGraph();
        }
    }
}

// 공통가치대응 VALUE1,2,3 셀의 복사된 블럭 정보를 관리하는 전역 객체
let commonValuesCopiedBlocks = {};

// [추가] 드래그 시작한 셀 정보를 저장하는 전역 변수
let draggedFromCell = null;

// 삭제 ZONE 표시 함수
function showDeleteZone() {
    let deleteZone = document.getElementById('deleteZone');
    if (!deleteZone) {
        deleteZone = document.createElement('div');
        deleteZone.id = 'deleteZone';
        deleteZone.innerHTML = `
            <div style="
                position: fixed;
                right: 32px;
                bottom: 32px;
                background: #dc3545;
                color: white;
                padding: 20px;
                border-radius: 10px;
                text-align: center;
                z-index: 10000;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                border: 3px dashed #fff;
                min-width: 200px;
            ">
                <div style="font-size: 24px; margin-bottom: 10px;">🗑️</div>
                <div style="font-weight: bold; margin-bottom: 5px;">삭제 영역</div>
                <div style="font-size: 14px;">블럭을 여기에 드롭하면 삭제됩니다</div>
            </div>
        `;
        document.body.appendChild(deleteZone);
        
        // 드롭 이벤트 설정
        deleteZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            deleteZone.style.background = '#c82333';
        });
        
        deleteZone.addEventListener('dragleave', (e) => {
            deleteZone.style.background = '#dc3545';
        });
        
        deleteZone.addEventListener('drop', (e) => {
            e.preventDefault();
            const courseName = e.dataTransfer.getData('text/plain');
            const course = courses.find(c => c.courseName === courseName);
            if (course && draggedFromCell) {
                const { subjectType, valueKey, isRequired } = draggedFromCell;
                
                // value 컬럼에서 드래그한 경우
                if (valueKey) {
                    if (commonValuesCopiedBlocks[subjectType] && commonValuesCopiedBlocks[subjectType][valueKey]) {
                        const index = commonValuesCopiedBlocks[subjectType][valueKey].indexOf(course.id);
                        if (index > -1) {
                            commonValuesCopiedBlocks[subjectType][valueKey].splice(index, 1);
                        }
                    }
                }
                // 전공필수/선택에서 드래그한 경우 - 해당 분류 제거
                else if (isRequired !== undefined) {
                    course.subjectType = null;
                    course.isRequired = null;
                }
                
                // 드래그가 완전히 종료된 후 렌더링
                setTimeout(() => {
                    renderCommonValuesTable();
                }, 50);
                showToast(`"${courseName}" 블럭이 삭제되었습니다.`);
            }
            // 드래그 시작 셀 정보 초기화
            draggedFromCell = null;
            hideDeleteZone();
        });
    }
    deleteZone.style.display = 'block';
}

// 삭제 ZONE 숨기기 함수
function hideDeleteZone() {
    const deleteZone = document.getElementById('deleteZone');
    if (deleteZone) {
        deleteZone.style.display = 'none';
    }
}

// 공통가치대응 탭 글씨크기 상태 변수
let commonValuesFontSize = 14;

function updateCommonValuesFontSize() {
    // CSS 변수로 폰트 크기 적용 (공통가치대응 탭에만 영향)
    document.documentElement.style.setProperty('--font-size', commonValuesFontSize + 'px');
    // 폰트 크기 표시 UI 동기화
    const display = document.getElementById('commonValues-font-size-display');
    if (display) display.textContent = commonValuesFontSize + 'px';
    
    // 화살표 즉시 업데이트
    setTimeout(() => {
        const movedCoursesForGhost = getMovedCoursesForGhost();
        drawMoveArrows(movedCoursesForGhost);
    }, 10);
}

function increaseCommonValuesFontSize() {
    if (commonValuesFontSize < 24) {
        commonValuesFontSize += 1;
        updateCommonValuesFontSize();
    }
}

function decreaseCommonValuesFontSize() {
    if (commonValuesFontSize > 10) {
        commonValuesFontSize -= 1;
        updateCommonValuesFontSize();
    }
}

// 공통가치대응 탭을 렌더링할 때 폰트 크기도 반영
const originalRenderCommonValuesTable = renderCommonValuesTable;
renderCommonValuesTable = function() {
    originalRenderCommonValuesTable.apply(this, arguments);
    updateCommonValuesFontSize();
}

window.increaseCommonValuesFontSize = increaseCommonValuesFontSize;
window.decreaseCommonValuesFontSize = decreaseCommonValuesFontSize;

function toggleCommonValuesFullscreen() {
    const commonValuesContent = document.getElementById('commonValues');
    const fullscreenText = document.getElementById('commonValues-fullscreen-text');
    if (!commonValuesContent || !fullscreenText) return;
    if (commonValuesContent.classList.contains('fullscreen-active')) {
        commonValuesContent.classList.remove('fullscreen-active');
        fullscreenText.textContent = '전체 화면';
    } else {
        commonValuesContent.classList.add('fullscreen-active');
        fullscreenText.textContent = '화면 축소';
    }
}
window.toggleCommonValuesFullscreen = toggleCommonValuesFullscreen;

// 공통가치대응 셀 텍스트 저장용 객체
let commonValuesCellTexts = {};

function startCommonValuesCellEdit(cell, subjectType, valueKey) {
    if (cell.classList.contains('editing-cell')) return;
    
    // 셀 편집 중 플래그 설정
    isCommonValuesCellEditing = true;
    
    // block-wrap에서 실제 내용 가져오기
    const blockWrap = cell.querySelector('.block-wrap');
    let originalContent = '';
    
    if (blockWrap) {
        originalContent = blockWrap.innerHTML || '';
        // <br> 태그를 줄바꿈으로 변환
        originalContent = originalContent.replace(/<br\s*\/?>/gi, '\n');
        // HTML 태그 제거
        originalContent = originalContent.replace(/<[^>]*>/g, '');
        originalContent = originalContent.trim();
    } else {
        originalContent = cell.textContent || '';
    }
    
    cell.setAttribute('data-original-content', originalContent);
    cell.classList.add('editing-cell');
    
    // textarea 생성 (셀 전체 영역 사용)
    const textarea = document.createElement('textarea');
    textarea.value = originalContent;
    textarea.className = 'cell-edit-textarea';
    textarea.style.width = '100%';
    textarea.style.height = '100%';
    textarea.style.minHeight = '100%';
    textarea.style.overflow = 'auto';
    textarea.style.padding = '4px';
    textarea.style.margin = '0';
    textarea.style.borderRadius = '4px';
    textarea.style.border = '1.5px solidrgb(250, 0, 0)';
    textarea.style.background = '#bdbdbd';
    textarea.style.fontSize = 'inherit';
    textarea.style.fontFamily = 'inherit';
    textarea.style.resize = 'none';
    textarea.style.outline = 'none';
    textarea.style.position = 'absolute';
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.right = '0';
    textarea.style.bottom = '0';
    
    // autosize
    function autosize(el) {
        el.style.height = 'auto';
        el.style.height = (el.scrollHeight) + 'px';
    }
    textarea.addEventListener('input', function() { autosize(textarea); });
    setTimeout(function() { autosize(textarea); }, 0);
    
    // 이벤트
    textarea.addEventListener('blur', () => saveCommonValuesCellEdit(cell, textarea.value, subjectType, valueKey));
    textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            cancelCommonValuesCellEdit(cell);
        }
        // Enter는 줄바꿈만, 저장은 blur로
    });
    
    cell.innerHTML = '';
    cell.appendChild(textarea);
    textarea.focus();
    textarea.select();
}
function saveCommonValuesCellEdit(cell, newValue, subjectType, valueKey) {
    // 임시 저장소 초기화
    if (!tempCommonValuesCellTexts[subjectType]) tempCommonValuesCellTexts[subjectType] = {};
    
    // 실제 데이터 저장소 초기화
    if (!commonValuesCellTexts[subjectType]) commonValuesCellTexts[subjectType] = {};
    
    // 모든 줄바꿈을 \n으로 통일해서 저장
    const normalized = newValue.replace(/\r\n|\r|\n/g, '\n');
    
    // 임시 저장소에 저장
    tempCommonValuesCellTexts[subjectType][valueKey] = normalized;
    
    // 실제 데이터에도 반영 (임시 데이터는 버전 저장 시 사용)
    commonValuesCellTexts[subjectType][valueKey] = normalized;
    
    cell.classList.remove('editing-cell');
    cell.removeAttribute('data-original-content');
    
    // block-wrap에 내용 저장 (다른 셀에 영향 주지 않도록 직접 업데이트)
    const blockWrap = cell.querySelector('.block-wrap');
    if (blockWrap) {
        // 표시할 때는 \n을 <br>로 변환
        blockWrap.innerHTML = normalized.replace(/\n/g, '<br>');
    } else {
        // block-wrap이 없는 경우 셀에 직접 저장
        cell.innerHTML = normalized.replace(/\n/g, '<br>');
    }
    
    // 편집 모드 상태에 따라 셀 클래스 및 이벤트 리스너 복원
    if (isEditModeCommonValues) {
        cell.classList.add('editable-cell');
        cell.style.cursor = 'pointer';
        cell.style.position = 'relative';
        cell.onclick = function(e) {
            startCommonValuesCellEdit(cell, subjectType, valueKey);
        };
    } else {
        cell.classList.remove('editable-cell');
        cell.style.cursor = '';
        cell.style.position = '';
        cell.onclick = null;
    }
    
    // 셀 편집 완료 플래그 해제
    isCommonValuesCellEditing = false;
    
    // 같은 행의 다른 셀들이 영향을 받지 않도록 확인
    // 같은 subjectType의 다른 value 셀들이 편집 중이 아닌지 확인
    const valueKeys = ['value1', 'value2', 'value3'];
    let otherCellsEditing = false;
    
    valueKeys.forEach(key => {
        if (key !== valueKey) {
            const otherCell = document.getElementById(`commonValues-cell-${subjectType}-${key}`);
            if (otherCell && otherCell.classList.contains('editing-cell')) {
                otherCellsEditing = true;
            }
        }
    });
    
    // 다른 셀이 편집 중이 아니면 전체 테이블 렌더링 방지
    if (!otherCellsEditing) {
        // 셀 편집 완료 후 전체 테이블 렌더링을 방지하기 위해 플래그 설정
        isCommonValuesCellEditing = false;
        
        // 다른 셀들의 내용을 보존하기 위해 데이터를 업데이트
        valueKeys.forEach(key => {
            if (key !== valueKey) {
                const otherCell = document.getElementById(`commonValues-cell-${subjectType}-${key}`);
                if (otherCell) {
                    const wrap = otherCell.querySelector('.block-wrap');
                    if (wrap) {
                        const existingContent = wrap.innerHTML.trim();
                        if (existingContent) {
                            // 기존 내용을 데이터에 저장
                            if (!commonValuesCellTexts[subjectType]) {
                                commonValuesCellTexts[subjectType] = {};
                            }
                            const textContent = existingContent.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '');
                            commonValuesCellTexts[subjectType][key] = textContent;
                        }
                    }
                }
            }
        });
        
        // 임시 저장소에도 다른 셀들의 내용을 저장
        if (!tempCommonValuesCellTexts[subjectType]) {
            tempCommonValuesCellTexts[subjectType] = {};
        }
        valueKeys.forEach(key => {
            if (key !== valueKey) {
                const otherCell = document.getElementById(`commonValues-cell-${subjectType}-${key}`);
                if (otherCell) {
                    const wrap = otherCell.querySelector('.block-wrap');
                    if (wrap) {
                        const existingContent = wrap.innerHTML.trim();
                        if (existingContent) {
                            const textContent = existingContent.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '');
                            tempCommonValuesCellTexts[subjectType][key] = textContent;
                        }
                    }
                }
            }
        });
    }
    
    showToast('변경사항이 임시 저장되었습니다. 버전 저장 버튼을 눌러주세요.');
}
function cancelCommonValuesCellEdit(cell) {
    const originalContent = cell.getAttribute('data-original-content');
    cell.classList.remove('editing-cell');
    cell.removeAttribute('data-original-content');
    
    // block-wrap에 원래 내용 복원
    const blockWrap = cell.querySelector('.block-wrap');
    if (blockWrap) {
        blockWrap.innerHTML = originalContent.replace(/\n/g, '<br>');
    } else {
        cell.textContent = originalContent;
    }
    
    // 편집 모드 상태에 따라 셀 클래스 및 이벤트 리스너 복원
    if (isEditModeCommonValues) {
        cell.classList.add('editable-cell');
        cell.style.cursor = 'pointer';
        cell.style.position = 'relative';
        // 셀의 id에서 subjectType과 valueKey 추출
        const cellId = cell.id;
        const match = cellId.match(/commonValues-cell-([^-]+)-value([123])/);
        if (match) {
            const subjectType = match[1];
            const valueKey = 'value' + match[2];
            cell.onclick = function(e) {
                startCommonValuesCellEdit(cell, subjectType, valueKey);
            };
        }
    } else {
        cell.classList.remove('editable-cell');
        cell.style.cursor = '';
        cell.style.position = '';
        cell.onclick = null;
    }
    
    // 셀 편집 완료 플래그 해제
    isCommonValuesCellEditing = false;
    
    // 같은 행의 다른 셀들이 영향을 받지 않도록 확인
    // 같은 subjectType의 다른 value 셀들이 편집 중이 아닌지 확인
    const cellId = cell.id;
    const match = cellId.match(/commonValues-cell-([^-]+)-value([123])/);
    if (match) {
        const subjectType = match[1];
        const valueKeys = ['value1', 'value2', 'value3'];
        let otherCellsEditing = false;
        
        valueKeys.forEach(key => {
            const otherCell = document.getElementById(`commonValues-cell-${subjectType}-${key}`);
            if (otherCell && otherCell.classList.contains('editing-cell')) {
                otherCellsEditing = true;
            }
        });
        
        // 다른 셀이 편집 중이 아니면 전체 테이블 렌더링 방지
        if (!otherCellsEditing) {
            // 셀 편집 완료 후 전체 테이블 렌더링을 방지하기 위해 플래그 설정
            isCommonValuesCellEditing = false;
            
            // 다른 셀들의 내용을 보존하기 위해 데이터를 업데이트
            valueKeys.forEach(key => {
                const otherCell = document.getElementById(`commonValues-cell-${subjectType}-${key}`);
                if (otherCell) {
                    const wrap = otherCell.querySelector('.block-wrap');
                    if (wrap) {
                        const existingContent = wrap.innerHTML.trim();
                        if (existingContent) {
                            // 기존 내용을 데이터에 저장
                            if (!commonValuesCellTexts[subjectType]) {
                                commonValuesCellTexts[subjectType] = {};
                            }
                            const textContent = existingContent.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '');
                            commonValuesCellTexts[subjectType][key] = textContent;
                        }
                    }
                }
            });
            
            // 임시 저장소에도 다른 셀들의 내용을 저장
            if (!tempCommonValuesCellTexts[subjectType]) {
                tempCommonValuesCellTexts[subjectType] = {};
            }
            valueKeys.forEach(key => {
                const otherCell = document.getElementById(`commonValues-cell-${subjectType}-${key}`);
                if (otherCell) {
                    const wrap = otherCell.querySelector('.block-wrap');
                    if (wrap) {
                        const existingContent = wrap.innerHTML.trim();
                        if (existingContent) {
                            const textContent = existingContent.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '');
                            tempCommonValuesCellTexts[subjectType][key] = textContent;
                        }
                    }
                }
            });
        }
    }
}

// 공통가치대응 테이블 엑셀 내보내기 (실제 엑셀 파일로 내보내기, 표 구조 보존)
function exportCommonValuesToExcel() {
    const table = document.querySelector('.common-values-table');
    if (!table) return;
    
    // SheetJS 라이브러리 확인
    if (typeof XLSX === 'undefined') {
        alert('엑셀 내보내기 기능을 사용하려면 SheetJS 라이브러리가 필요합니다.');
        return;
    }
    
    // 워크북 생성
    const wb = XLSX.utils.book_new();
    
    // 데이터 배열 생성
    const data = [];
    
    // 테이블 제목 추가
    const commonValuesTitle = document.getElementById('commonValuesTitle');
    if (commonValuesTitle && commonValuesTitle.textContent.trim()) {
        data.push([commonValuesTitle.textContent.trim()]);
        data.push([]); // 빈 행 추가
    }
    
    const rows = table.querySelectorAll('tr');
    
    rows.forEach((row, rowIndex) => {
        const cells = row.querySelectorAll('th, td');
        const rowData = [];
        
        cells.forEach((cell, cellIndex) => {
            let text = cell.textContent || cell.innerText || '';
            
            // 셀 병합 정보 확인
            const colspan = cell.getAttribute('colspan');
            const rowspan = cell.getAttribute('rowspan');
            
            // 빈 셀 처리 (병합된 셀의 경우)
            if (text.trim() === '' && (colspan || rowspan)) {
                text = '';
            }
            
            // 줄바꿈 유지 (엑셀에서는 \n을 줄바꿈으로 인식)
            text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n'); // 줄바꿈 통일
            text = text.replace(/[ \t]+/g, ' ').trim(); // 연속 공백 제거 (줄바꿈 제외)
            
            rowData.push(text);
        });
        
        // 빈 행이 아닌 경우에만 추가
        if (rowData.some(cell => cell !== '')) {
            data.push(rowData);
        }
    });
    
    // 워크시트 생성
    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // 셀 병합 정보 처리
    const merges = [];
    let mergeRowIndex = 0;
    
    rows.forEach((row, rowIndex) => {
        const cells = row.querySelectorAll('th, td');
        let mergeColIndex = 0;
        
        cells.forEach((cell, cellIndex) => {
            const colspan = parseInt(cell.getAttribute('colspan')) || 1;
            const rowspan = parseInt(cell.getAttribute('rowspan')) || 1;
            
            if (colspan > 1 || rowspan > 1) {
                merges.push({
                    s: { r: mergeRowIndex, c: mergeColIndex },
                    e: { r: mergeRowIndex + rowspan - 1, c: mergeColIndex + colspan - 1 }
                });
            }
            
            mergeColIndex += colspan;
        });
        
        mergeRowIndex++;
    });
    
    if (merges.length > 0) {
        ws['!merges'] = merges;
    }
    
    // 열 너비 자동 조정
    const colWidths = [];
    data.forEach(row => {
        row.forEach((cell, colIndex) => {
            if (!colWidths[colIndex]) colWidths[colIndex] = 0;
            const cellLength = String(cell).length;
            colWidths[colIndex] = Math.max(colWidths[colIndex], cellLength);
        });
    });
    
    ws['!cols'] = colWidths.map(width => ({ width: Math.min(Math.max(width + 2, 8), 50) }));
    
    // 워크북에 워크시트 추가
    XLSX.utils.book_append_sheet(wb, ws, '공통가치대응');
    
    // 파일명에 현재 날짜 추가
    const now = new Date();
    const dateStr = now.getFullYear() + 
                   String(now.getMonth() + 1).padStart(2, '0') + 
                   String(now.getDate()).padStart(2, '0');
    const filename = `공통가치대응_${dateStr}.xlsx`;
    
    // 파일 다운로드
    XLSX.writeFile(wb, filename);
}

// 공통가치대응 PDF 내보내기 (벡터 기반, 페이지 모습 보존)
function exportCommonValuesToPDF() {
    const table = document.querySelector('.common-values-table');
    if (!table) return;
    
    // jsPDF 라이브러리 확인
    if (typeof window.jsPDF === 'undefined') {
        alert('PDF 내보내기 기능을 사용하려면 jsPDF 라이브러리가 필요합니다.');
        return;
    }
    
    // jsPDF 인스턴스 생성 (가로 방향)
    const { jsPDF } = window.jsPDF;
    const doc = new jsPDF('landscape', 'mm', 'a4');
    
    // 페이지 크기 설정
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    
    // 제목 추가
    const commonValuesTitle = document.getElementById('commonValuesTitle');
    const titleText = commonValuesTitle ? commonValuesTitle.textContent.trim() : '공통가치대응';
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(titleText, pageWidth / 2, margin + 10, { align: 'center' });
    
    // 테이블 데이터 추출
    const tableData = [];
    const rows = table.querySelectorAll('tr');
    
    rows.forEach(row => {
        const rowData = [];
        const cells = row.querySelectorAll('th, td');
        
        cells.forEach(cell => {
            let text = cell.textContent || cell.innerText || '';
            // 줄바꿈 처리
            text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
            rowData.push(text);
        });
        
        if (rowData.some(cell => cell !== '')) {
            tableData.push(rowData);
        }
    });
    
    // 테이블 스타일 설정
    const tableConfig = {
        startY: margin + 20,
        styles: {
            fontSize: 8,
            cellPadding: 3,
            lineColor: [0, 0, 0],
            lineWidth: 0.1,
            textColor: [0, 0, 0]
        },
        headStyles: {
            fillColor: [44, 62, 80],
            textColor: [255, 255, 255],
            fontSize: 9,
            fontStyle: 'bold'
        },
        alternateRowStyles: {
            fillColor: [245, 245, 245]
        },
        columnStyles: {
            0: { cellWidth: 30 }, // 과목분류
            1: { cellWidth: 50 }, // 가치1
            2: { cellWidth: 50 }, // 가치2
            3: { cellWidth: 50 }, // 가치3
        },
        didDrawCell: function(data) {
            // 셀 내용이 긴 경우 줄바꿈 처리
            if (data.cell.text && data.cell.text.length > 25) {
                const lines = doc.splitTextToSize(data.cell.text, data.cell.width - 4);
                if (lines.length > 1) {
                    data.cell.text = lines;
                }
            }
        }
    };
    
    // 테이블 그리기
    doc.autoTable({
        ...tableConfig,
        body: tableData.slice(1), // 헤더 제외
        head: [tableData[0]] // 첫 번째 행을 헤더로
    });
    
    // 파일명에 현재 날짜 추가
    const now = new Date();
    const dateStr = now.getFullYear() + 
                   String(now.getMonth() + 1).padStart(2, '0') + 
                   String(now.getDate()).padStart(2, '0');
    const filename = `공통가치대응_${dateStr}.pdf`;
    
    // PDF 저장
    doc.save(filename);
}

// 모든 버전 데이터를 파일로 내보내기 (다운로드)
function exportVersionsToFile() {
    // 현재 메모리의 모든 버전 데이터를 새로운 탭별 구조로 변환
    const exportData = {
        versions: {},
        currentVersion: currentVersion,
        exportDate: new Date().toISOString(),
        structure: "tab-based" // 새로운 구조임을 명시
    };
    
    // 각 버전을 새로운 탭별 구조로 변환
    Object.keys(versions).forEach(versionName => {
        const oldVersion = versions[versionName];
        const newVersion = {
            // 1. 교과목 관리 탭
            coursesTab: {
                courses: oldVersion.courses || oldVersion.coursesTab?.courses || [],
                initialCourses: oldVersion.initialCourses || oldVersion.coursesTab?.initialCourses || []
            },
            
            // 2. 수행평가 매트릭스 탭
            matrixTab: {
                matrixData: oldVersion.matrixData || oldVersion.matrixTab?.matrixData || {},
                matrixTitleText: oldVersion.matrixTitleText || oldVersion.matrixTab?.matrixTitleText || '',
                matrixExtraTableData: oldVersion.matrixExtraTableData || oldVersion.matrixTab?.matrixExtraTableData || {}
            },
            
            // 3. 이수모형 탭
            curriculumTab: {
                curriculumCellTexts: oldVersion.curriculumCellTexts || oldVersion.curriculumTab?.curriculumCellTexts || {},
                curriculumTitleText: oldVersion.curriculumTitleText || oldVersion.curriculumTab?.curriculumTitleText || ''
            },
            
            // 4. 공통가치대응 탭
            commonValuesTab: {
                commonValuesCellTexts: oldVersion.commonValuesCellTexts || oldVersion.commonValuesTab?.commonValuesCellTexts || {},
                commonValuesTitleText: oldVersion.commonValuesTitleText || oldVersion.commonValuesTab?.commonValuesTitleText || ''
            },
            
            // 공통 설정
            settings: {
                designSettings: oldVersion.designSettings || oldVersion.settings?.designSettings || {},
                changeHistory: oldVersion.changeHistory || oldVersion.settings?.changeHistory || []
            },
            
            // 메타데이터
            metadata: {
                description: oldVersion.description || oldVersion.metadata?.description || '',
                saveDate: oldVersion.saveDate || oldVersion.metadata?.saveDate || new Date().toISOString()
            }
        };
        
        exportData.versions[versionName] = newVersion;
    });
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'uosmatrix_version.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('모든 버전이 새로운 탭별 구조로 내보내졌습니다.');
}

// 버전 파일 불러오기 (Import) 기능 추가
function importVersionsFromFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importData = JSON.parse(e.target.result);
                
                // 구조 확인
                if (importData.structure === "tab-based") {
                    // 새로운 탭별 구조
                    versions = importData.versions || {};
                    currentVersion = importData.currentVersion || '기본';
                } else {
                    // 기존 구조 호환성
                    versions = importData.versions || importData;
                    currentVersion = importData.currentVersion || Object.keys(versions)[0] || '기본';
                }
                
                // localStorage에 저장
                localStorage.setItem('uosVersions', JSON.stringify(versions));
                localStorage.setItem('uosCurrentVersion', currentVersion);
                
                // 버전 관리 모달이 열려있다면 버전 목록 새로고침
                const versionManagerModal = document.getElementById('versionManagerModal');
                if (versionManagerModal && versionManagerModal.style.display === 'block') {
                    renderVersionList();
                    showToast('버전 파일이 성공적으로 불러와졌습니다.');
                } else {
                    // 페이지 새로고침하여 데이터 적용
                    location.reload();
                    showToast('버전 파일이 성공적으로 불러와졌습니다.');
                }
            } catch (error) {
                alert('파일 형식이 올바르지 않습니다.');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// window에 함수 등록 (index.html에서 호출 가능)
window.exportVersionsToFile = exportVersionsToFile;
window.importVersionsFromFile = importVersionsFromFile;
window.exportCommonValuesToExcel = exportCommonValuesToExcel;
window.exportCommonValuesToPDF = exportCommonValuesToPDF;

// matrix-extra-table(하부 안내 표) 별도 데이터 구조
let matrixExtraTableData = {};

// matrix-extra-table 렌더링 함수 (셀 id 기준)
function renderMatrixExtraTable() {
    const table = document.querySelector('.matrix-extra-table');
    if (!table) return;
    
    const cells = table.querySelectorAll('td');
    
    // 항상 같은 순서로 id 부여
    cells.forEach((cell, idx) => {
        cell.id = 'matrix-extra-cell-' + idx;
        
        // 데이터가 있으면 표시, 빈 문자열도 <br>로 명확히 표시
        if (matrixExtraTableData && cell.id in matrixExtraTableData) {
            const cellData = matrixExtraTableData[cell.id];
            cell.innerHTML = cellData === '' ? '<br>' : cellData.replace(/\n/g, '<br>');
        } else {
            cell.innerHTML = '<br>';
        }
        
        // 편집 모드에 따라 이벤트 연결
        if (isEditModeMatrix) {
            cell.style.cursor = 'pointer';
            cell.onclick = function() {
                startMatrixExtraCellEdit(cell);
            };
        } else {
            cell.style.cursor = '';
            cell.onclick = null;
        }
    });
    
}

// 매트릭스 하부 안내 표 셀 편집 시작
function startMatrixExtraCellEdit(cell) {
    if (cell.querySelector('textarea')) return;
    
    // 셀 ID 확인
    if (!cell.id) {
        const idx = Array.from(cell.parentNode.children).indexOf(cell);
        cell.id = 'matrix-extra-cell-' + idx;
    }
    
    const original = cell.innerText;
    cell.innerHTML = '';
    
    // 데이터 확인 로깅
    
    // textarea 생성 (셀 전체 영역 사용)
    const textarea = document.createElement('textarea');
    // 저장된 데이터가 있으면 우선 사용, 없으면 현재 셀 내용 사용
    const savedData = matrixExtraTableData && matrixExtraTableData[cell.id];
    textarea.value = savedData !== undefined ? savedData : original;
    
    textarea.style.width = '100%';
    textarea.style.height = '100%';
    textarea.style.minHeight = '100%';
    textarea.style.fontSize = 'inherit';
    textarea.style.fontFamily = 'inherit';
    textarea.style.resize = 'none';
    textarea.style.padding = '4px';
    textarea.style.margin = '0';
    textarea.style.border = '1.5px solid #bdbdbd';
    textarea.style.borderRadius = '4px';
    textarea.style.background = '#fffbe7';
    textarea.style.position = 'absolute';
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.right = '0';
    textarea.style.bottom = '0';
    
    // 자동 높이 조절
    function autosize(el) {
        el.style.height = 'auto';
        el.style.height = (el.scrollHeight) + 'px';
    }
    textarea.addEventListener('input', function() { autosize(textarea); });
    
    textarea.onblur = function() {
        saveMatrixExtraCellEdit(cell, textarea.value);
    };
    
    textarea.onkeydown = function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            textarea.blur();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cell.innerHTML = original;
        }
    };
    
    cell.appendChild(textarea);
    setTimeout(function() { autosize(textarea); }, 0);
    textarea.focus();
    textarea.select();
}

// 임시 저장소 (버전 저장 전까지 임시 보관)
let tempMatrixExtraTableData = {};
let tempCourses = [];
let tempCurriculumCellTexts = {};
let tempCommonValuesCellTexts = {};
let tempMatrixData = {};

// 임시 저장소 초기화 함수
function clearTempStorage() {
    tempMatrixExtraTableData = {};
    tempCourses = [];
    tempCurriculumCellTexts = {};
    tempCommonValuesCellTexts = {};
    tempMatrixData = {};
    
    // 매트릭스 제목 변경사항도 초기화
    const titleElement = document.getElementById('matrixTitle');
    if (titleElement && titleElement.getAttribute('data-original-title')) {
        titleElement.textContent = titleElement.getAttribute('data-original-title');
        titleElement.removeAttribute('data-original-title');
    }
    
    // 공통가치대응 제목 변경사항도 초기화
    const commonValuesTitleElement = document.getElementById('commonValuesTitle');
    if (commonValuesTitleElement && commonValuesTitleElement.getAttribute('data-original-title')) {
        commonValuesTitleElement.textContent = commonValuesTitleElement.getAttribute('data-original-title');
        commonValuesTitleElement.removeAttribute('data-original-title');
    }
}

// 모든 탭의 수정모드 상태 초기화
function resetAllEditModes() {
    isEditMode = false;
    isEditModeMatrix = false;
    isEditModeCurriculum = false;
    isEditModeCommonValues = false;
    
    // 각 탭의 수정모드 버튼 상태 초기화
    const buttons = [
        { id: 'editModeToggleCourses', textId: 'editModeTextCourses' },
        { id: 'editModeToggle', textId: 'editModeText' },
        { id: 'editModeToggleCurriculum', textId: 'editModeTextCurriculum' },
        { id: 'editModeToggleCommonValues', textId: 'editModeTextCommonValues' }
    ];
    
    buttons.forEach(btn => {
        const button = document.getElementById(btn.id);
        const text = document.getElementById(btn.textId);
        if (button) {
            button.classList.remove('active');
        }
        if (text) {
            text.textContent = '일반모드';
        }
    });
    
    // 각 탭별 편집 기능 비활성화
    disableCellEditing();
    setMatrixTitleEditable(false);
    setCurriculumTitleEditable(false);
    setCommonValuesTitleEditable(false);
    toggleMatrixExtraTableEditMode();
    updateAllCourseBlocksDraggable();
    updateCommonValuesCourseBlocksDraggable();
}

// 매트릭스 하부 안내 표 셀 편집 저장 (임시 저장)
function saveMatrixExtraCellEdit(cell, value) {
    // 임시 저장소에 저장
    tempMatrixExtraTableData[cell.id] = value;
    
    // 실제 데이터에도 반영 (임시 데이터는 버전 저장 시 사용)
    matrixExtraTableData[cell.id] = value;
    
    // 현재 셀만 업데이트하고 다른 셀들은 그대로 유지
    cell.innerHTML = value.replace(/\n/g, '<br>');
    
    // 디버깅을 위한 로그
    
    showToast('변경사항이 임시 저장되었습니다. 버전 저장 버튼을 눌러주세요.');
}

// matrix extra 표의 모든 셀 내용을 수집하는 함수
function collectMatrixExtraTableData() {
    const table = document.querySelector('.matrix-extra-table');
    if (!table) return {};
    const collectedData = {};
    const cells = table.querySelectorAll('td');
    
    
    // 항상 같은 순서로 id 부여
    cells.forEach((cell, idx) => {
        cell.id = 'matrix-extra-cell-' + idx;
        
        // 셀 내용 가져오기 (innerHTML을 사용하고 <br> 태그를 줄바꿈으로 변환)
        let cellContent = cell.innerHTML || '';
        
        // <br> 태그가 있으면 줄바꿈으로 변환
        cellContent = cellContent.replace(/<br\s*\/?>/gi, '\n');
        
        // HTML 태그 제거 (하지만 내용은 보존)
        cellContent = cellContent.replace(/<[^>]*>/g, '');
        
        // 모든 셀을 반드시 저장 (빈 셀도 빈 문자열로 저장)
        collectedData[cell.id] = cellContent;
        
        // 디버깅: 각 셀의 내용 확인
    });
    
    return collectedData;
}

// 디버깅용: 현재 이수모형 표의 모든 셀 데이터 확인
function debugCurriculumCells() {
    const data = collectCurriculumTableData();
    
    // 빈 셀과 내용이 있는 셀 분류
    const emptyCells = [];
    const filledCells = [];
    
    Object.entries(data).forEach(([cellId, content]) => {
        if (!content || content.trim() === '') {
            emptyCells.push(cellId);
        } else {
            filledCells.push({ cellId, content });
        }
    });
    
    
    if (filledCells.length > 0) {
        filledCells.forEach(({ cellId, content }) => {
        });
    }
    
    if (emptyCells.length > 0 && emptyCells.length <= 20) {
        emptyCells.forEach(cellId => {
        });
    } else if (emptyCells.length > 20) {
    }
    
    // 저장된 curriculumCellTexts와 비교
    
    const savedEmptyCells = [];
    const savedFilledCells = [];
    
    Object.entries(curriculumCellTexts).forEach(([cellId, content]) => {
        if (!content || content.trim() === '') {
            savedEmptyCells.push(cellId);
        } else {
            savedFilledCells.push({ cellId, content });
        }
    });
    
    
    if (savedFilledCells.length > 0) {
        savedFilledCells.forEach(({ cellId, content }) => {
        });
    }
    
    return data;
}

// 글로벌 함수로 등록 (콘솔에서 사용 가능)
window.debugCurriculumCells = debugCurriculumCells;

// 디버깅용: 현재 매트릭스 데이터 상태 확인
function debugMatrixData() {
    
    if (tempMatrixData._titleChanged) {
        // 매트릭스 제목이 변경됨
    }
    
    return {
        matrixData: matrixData,
        tempMatrixData: tempMatrixData
    };
}

// 글로벌 함수로 등록 (콘솔에서 사용 가능)
window.debugMatrixData = debugMatrixData;

// 이수모형 탭의 현재 셀 데이터를 수집하는 함수
function collectCurriculumTableData() {
    const table = document.querySelector('.curriculum-table');
    if (!table) {
        return {};
    }
    const collectedData = {};
    
    // 모든 td 셀을 선택 (id가 있는 것만)
    const cells = table.querySelectorAll('td[id]');
    
    
    cells.forEach((cell) => {
        if (cell.id) {
            // 셀 내용 가져오기 (innerHTML을 사용하고 <br> 태그를 줄바꿈으로 변환)
            let cellContent = cell.innerHTML || '';
            
            // 교과목 블록이 있는 경우는 블록 제외하고 텍스트만 추출
            const courseBlocks = cell.querySelectorAll('.course-block');
            if (courseBlocks.length > 0) {
                // 교과목 블록이 있는 셀에서 블록을 제외한 텍스트 추출
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = cellContent;
                
                // 교과목 블록들 제거
                tempDiv.querySelectorAll('.course-block').forEach(block => block.remove());
                
                // 남은 텍스트 내용 추출
                cellContent = tempDiv.innerHTML || '';
                cellContent = cellContent.replace(/<br\s*\/?>/gi, '\n');
                cellContent = cellContent.replace(/<[^>]*>/g, '');
                cellContent = cellContent.trim();
            } else {
                // 일반 텍스트 셀
                // <br> 태그가 있으면 줄바꿈으로 변환
                cellContent = cellContent.replace(/<br\s*\/?>/gi, '\n');
                
                // HTML 태그 제거 (하지만 내용은 보존)
                cellContent = cellContent.replace(/<[^>]*>/g, '');
                cellContent = cellContent.trim();
            }
            
            // 모든 셀을 반드시 저장 (빈 셀도 빈 문자열로 저장)
            collectedData[cell.id] = cellContent;
            
            // 디버깅: 각 셀의 내용 확인
            if (cellContent) {
            }
        }
    });
    
    return collectedData;
}

// 디버깅용: 현재 공통가치대응 표의 모든 셀 데이터 확인
function debugCommonValuesCells() {
    const data = collectCommonValuesTableData();
    
    // 빈 셀과 내용이 있는 셀 분류
    const emptyCells = [];
    const filledCells = [];
    
    Object.entries(data).forEach(([cellId, content]) => {
        if (!content || content.trim() === '') {
            emptyCells.push(cellId);
        } else {
            filledCells.push({ cellId, content });
        }
    });
    
    
    if (filledCells.length > 0) {
        filledCells.forEach(({ cellId, content }) => {
        });
    }
    
    if (emptyCells.length > 0 && emptyCells.length <= 20) {
        emptyCells.forEach(cellId => {
        });
    } else if (emptyCells.length > 20) {
    }
    
    return data;
}

// 글로벌 함수로 등록 (콘솔에서 사용 가능)
window.debugCommonValuesCells = debugCommonValuesCells;

// 공통가치대응 탭의 현재 셀 데이터를 수집하는 함수
function collectCommonValuesTableData() {
    const table = document.querySelector('#commonValuesTable');
    if (!table) {
        return {};
    }
    const collectedData = {};
    
    // 수정모드에서 텍스트 입력이 가능한 셀만 수집
    // 공통가치대응I, II, III 셀들만 수집 (value1, value2, value3)
    const subjectTypes = [
        '설계', '디지털', '역사', '이론', '도시', '사회', '기술', '실무', '비교과'
    ];
    
    
    subjectTypes.forEach(subjectType => {
        // 공통가치대응I, II, III 셀들만 수집
        const value1Cell = document.getElementById(`commonValues-cell-${subjectType}-value1`);
        const value2Cell = document.getElementById(`commonValues-cell-${subjectType}-value2`);
        const value3Cell = document.getElementById(`commonValues-cell-${subjectType}-value3`);
        
        // 2차원 구조로 데이터 수집
        if (!collectedData[subjectType]) {
            collectedData[subjectType] = {};
        }
        
        // value1 셀 수집
        if (value1Cell) {
            const blockWrap = value1Cell.querySelector('.block-wrap');
            let cellContent = '';
            
            if (blockWrap) {
                cellContent = blockWrap.innerHTML || '';
                cellContent = cellContent.replace(/<br\s*\/?>/gi, '\n');
                cellContent = cellContent.replace(/<[^>]*>/g, '');
                cellContent = cellContent.trim();
            } else {
                cellContent = value1Cell.innerHTML || '';
                cellContent = cellContent.replace(/<br\s*\/?>/gi, '\n');
                cellContent = cellContent.replace(/<[^>]*>/g, '');
                cellContent = cellContent.trim();
            }
            
            collectedData[subjectType].value1 = cellContent;
        }
        
        // value2 셀 수집
        if (value2Cell) {
            const blockWrap = value2Cell.querySelector('.block-wrap');
            let cellContent = '';
            
            if (blockWrap) {
                cellContent = blockWrap.innerHTML || '';
                cellContent = cellContent.replace(/<br\s*\/?>/gi, '\n');
                cellContent = cellContent.replace(/<[^>]*>/g, '');
                cellContent = cellContent.trim();
            } else {
                cellContent = value2Cell.innerHTML || '';
                cellContent = cellContent.replace(/<br\s*\/?>/gi, '\n');
                cellContent = cellContent.replace(/<[^>]*>/g, '');
                cellContent = cellContent.trim();
            }
            
            collectedData[subjectType].value2 = cellContent;
        }
        
        // value3 셀 수집
        if (value3Cell) {
            const blockWrap = value3Cell.querySelector('.block-wrap');
            let cellContent = '';
            
            if (blockWrap) {
                cellContent = blockWrap.innerHTML || '';
                cellContent = cellContent.replace(/<br\s*\/?>/gi, '\n');
                cellContent = cellContent.replace(/<[^>]*>/g, '');
                cellContent = cellContent.trim();
            } else {
                cellContent = value3Cell.innerHTML || '';
                cellContent = cellContent.replace(/<br\s*\/?>/gi, '\n');
                cellContent = cellContent.replace(/<[^>]*>/g, '');
                cellContent = cellContent.trim();
            }
            
            collectedData[subjectType].value3 = cellContent;
        }
    });
    
    // 미분류 테이블의 편집 가능한 셀들도 수집 (필요한 경우)
    const unclassifiedTable = document.querySelector('#unclassifiedTable');
    if (unclassifiedTable) {
        const unclassifiedCells = unclassifiedTable.querySelectorAll('td');
        
        // 미분류 테이블에서도 편집 가능한 셀만 수집 (필요시)
        // 현재는 미분류 테이블에는 편집 가능한 텍스트 셀이 없으므로 제외
    }
    
    // 빈 셀과 내용이 있는 셀 분류
    const emptyCells = [];
    const filledCells = [];
    
    Object.entries(collectedData).forEach(([subjectType, values]) => {
        Object.entries(values).forEach(([valueKey, content]) => {
            if (!content || content.trim() === '') {
                emptyCells.push(`${subjectType}.${valueKey}`);
            } else {
                filledCells.push({ cellId: `${subjectType}.${valueKey}`, content });
            }
        });
    });
    
    
    return collectedData;
}

// 공통가치대응 제목 편집 가능하게 설정
function setCommonValuesTitleEditable(editable) {
    const titleElement = document.getElementById('commonValuesTitle');
    if (!titleElement) return;
    
    if (editable) {
        // 편집 모드로 설정
        titleElement.contentEditable = true;
        titleElement.style.border = '2px solid #007bff';
        titleElement.style.padding = '8px';
        titleElement.style.borderRadius = '4px';
        titleElement.style.backgroundColor = '#f8f9fa';
        titleElement.style.cursor = 'text';
        titleElement.focus();
        
        // 원본 제목 저장
        if (!titleElement.getAttribute('data-original-title')) {
            titleElement.setAttribute('data-original-title', titleElement.textContent);
        }
        
        // 편집 완료 이벤트 리스너 추가
        titleElement.addEventListener('blur', handleCommonValuesTitleInput);
        titleElement.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                titleElement.blur();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                titleElement.textContent = titleElement.getAttribute('data-original-title');
                titleElement.blur();
            }
        });
        
    } else {
        // 일반 모드로 설정
        titleElement.contentEditable = false;
        titleElement.style.border = '';
        titleElement.style.padding = '';
        titleElement.style.borderRadius = '';
        titleElement.style.backgroundColor = '';
        titleElement.style.cursor = '';
        
        // 이벤트 리스너 제거
        titleElement.removeEventListener('blur', handleCommonValuesTitleInput);
        
    }
}

// 공통가치대응 제목 입력 처리
function handleCommonValuesTitleInput() {
    const titleElement = document.getElementById('commonValuesTitle');
    if (!titleElement) return;
    
    const newTitle = titleElement.textContent.trim();
    const originalTitle = titleElement.getAttribute('data-original-title');
    
    if (newTitle !== originalTitle) {
        // 제목 변경사항을 임시 저장소에 저장
        if (!tempCommonValuesCellTexts._titleChanged) {
            tempCommonValuesCellTexts._titleChanged = true;
            tempCommonValuesCellTexts._oldTitle = originalTitle;
            tempCommonValuesCellTexts._newTitle = newTitle;
        } else {
            tempCommonValuesCellTexts._newTitle = newTitle;
        }
        
        // localStorage에 즉시 저장
        localStorage.setItem('commonValuesTitleText', newTitle);
        
        showToast('제목이 임시 저장되었습니다. 버전 저장 버튼을 눌러주세요.');
    }
    
    // 편집 모드 비활성화
    setCommonValuesTitleEditable(false);
}
// 버전 저장/복원에 matrixExtraTableData 포함
// saveVersionData, saveCurrentVersion, restoreVersion 등에서 matrixExtraTableData를 함께 저장/복원
// ... existing code ...

// 매트릭스 하부 안내 표 편집 모드 토글
function toggleMatrixExtraTableEditMode() {
    const table = document.querySelector('.matrix-extra-table');
    if (!table) return;
    
    const cells = table.querySelectorAll('td');
    cells.forEach((cell, idx) => {
        // 셀에 고유 id 부여 (없으면)
        if (!cell.id) cell.id = 'matrix-extra-cell-' + idx;
        
        if (isEditModeMatrix) {
            // 편집 모드: 클릭 이벤트 연결
            cell.style.cursor = 'pointer';
            cell.onclick = function() {
                startMatrixExtraCellEdit(cell);
            };
        } else {
            // 일반 모드: 클릭 이벤트 제거
            cell.style.cursor = '';
            cell.onclick = null;
        }
    });
}

// 테스트용: 교과목 이름 변경 함수
function testChangeCourseName() {
    if (courses.length > 0) {
        const firstCourse = courses[0];
        const oldName = firstCourse.courseName;
        firstCourse.courseName = oldName + '_수정됨';
        
        // 변경 이력 추가
        addChangeHistory('수정', oldName, [{field: 'courseName', before: oldName, after: firstCourse.courseName}]);
        
        // UI 업데이트
        renderCourses();
        renderCurriculumTable();
        renderChangeHistoryPanel();
        
    }
}
window.testChangeCourseName = testChangeCourseName;

// 색상 범례 생성 함수들
function generateColorLegend() {
    // 과목분류별 색상 정의
    const subjectTypeColors = {
        '설계': '#e8e8e8',
        '디지털': '#f5f2e5', 
        '역사': '#ffece1',
        '이론': '#e0f2f1',
        '도시': '#fce4ec',
        '사회': '#e8eaf6',
        '기술': '#fff3e0',
        '실무': '#e8f5e8',
        '비교과': '#f1f8e9'
    };
    
    // 구분별 색상 정의
    const categoryColors = {
        '교양': '#e9ecef',
        '건축적사고': '#e3f2fd',
        '설계': '#ffebee',
        '기술': '#fff3e0',
        '실무': '#e8f5e8',
        '기타': '#f3e5f5'
    };
    
    return { subjectTypeColors, categoryColors };
}

function updateColorLegendCurriculum() {
    const legendContainer = document.getElementById('colorLegendCurriculum');
    if (!legendContainer) return;
    
    const { subjectTypeColors, categoryColors } = generateColorLegend();
    const colors = colorModeBySubjectTypeCurriculum ? subjectTypeColors : categoryColors;
    
    legendContainer.innerHTML = '';
    legendContainer.className = 'color-legend';
    
    Object.entries(colors).forEach(([key, color]) => {
        const legendItem = document.createElement('div');
        legendItem.className = 'color-legend-item';
        
        const colorBox = document.createElement('div');
        colorBox.className = 'color-legend-box';
        colorBox.style.background = color;
        
        const label = document.createElement('span');
        label.className = 'color-legend-label';
        label.textContent = key;
        
        legendItem.appendChild(colorBox);
        legendItem.appendChild(label);
        legendContainer.appendChild(legendItem);
    });
}

function updateColorLegendCommonValues() {
    const legendContainer = document.getElementById('colorLegendCommonValues');
    if (!legendContainer) return;
    
    const { subjectTypeColors, categoryColors } = generateColorLegend();
    const colors = colorModeBySubjectType ? subjectTypeColors : categoryColors;
    
    legendContainer.innerHTML = '';
    legendContainer.className = 'color-legend';
    
    Object.entries(colors).forEach(([key, color]) => {
        const legendItem = document.createElement('div');
        legendItem.className = 'color-legend-item';
        
        const colorBox = document.createElement('div');
        colorBox.className = 'color-legend-box';
        colorBox.style.background = color;
        
        const label = document.createElement('span');
        label.className = 'color-legend-label';
        label.textContent = key;
        
        legendItem.appendChild(colorBox);
        legendItem.appendChild(label);
        legendContainer.appendChild(legendItem);
    });
}


// 전역 함수 할당 - 마지막에 실행되도록 보장
window.init = init;
window.initializeFirebase = initializeFirebase;
window.initializeUI = initializeUI;

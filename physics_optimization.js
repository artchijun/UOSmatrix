// 물리 시뮬레이션 장기 실행 최적화 메서드들
// 이 파일의 내용을 app.js의 PhysicsEffectsSystem 클래스에 추가해주세요.

// 🎯 적응형 성능 관리 시스템
shouldSkipFrame(frameElapsed, deltaTime) {
    // 성능 모드에 따른 FPS 제한
    const targetInterval = this.getTargetFrameInterval();
    
    // 배터리 절약 모드에서는 더 낮은 FPS
    if (this.powerSaveMode) {
        return frameElapsed < targetInterval * 2;
    }
    
    // 백그라운드 모드에서는 10fps로 제한
    if (this.backgroundMode) {
        return frameElapsed < 100; // 10fps
    }
    
    // 사용자 비활성 시간이 길면 FPS 감소
    const inactiveTime = Date.now() - this.lastUserActivity;
    if (inactiveTime > 30000) { // 30초 후
        return frameElapsed < targetInterval * 1.5; // 40fps로 감소
    }
    
    return frameElapsed < targetInterval;
}

getTargetFrameInterval() {
    switch (this.performanceMode) {
        case 'high': return 16.67; // 60fps
        case 'medium': return 33.33; // 30fps  
        case 'low': return 66.67; // 15fps
        case 'adaptive':
            // 성능 통계 기반 적응형 조절
            if (this.performanceStats.averageFrameTime > 25) {
                return 50; // 20fps
            } else if (this.performanceStats.averageFrameTime > 20) {
                return 33.33; // 30fps
            }
            return 16.67; // 60fps
        default: return 16.67;
    }
}

updatePerformanceStats(deltaTime) {
    const frameTime = deltaTime;
    
    // 프레임 타임 히스토리 관리 (최근 60프레임만 유지)
    this.performanceStats.frameTimeHistory.push(frameTime);
    if (this.performanceStats.frameTimeHistory.length > 60) {
        this.performanceStats.frameTimeHistory.shift();
    }
    
    // 평균 프레임 타임 계산
    const sum = this.performanceStats.frameTimeHistory.reduce((a, b) => a + b, 0);
    this.performanceStats.averageFrameTime = sum / this.performanceStats.frameTimeHistory.length;
    
    // 성능 모드 자동 조절 (5초마다)
    const now = Date.now();
    if (now - this.performanceStats.lastOptimizationTime > 5000) {
        this.optimizePerformance();
        this.performanceStats.lastOptimizationTime = now;
    }
}

optimizePerformance() {
    if (this.performanceMode !== 'adaptive') return;
    
    const avgFrameTime = this.performanceStats.averageFrameTime;
    
    // 성능이 좋으면 품질 향상
    if (avgFrameTime < 16 && this.targetFPS < 60) {
        this.targetFPS = Math.min(60, this.targetFPS + 5);
        console.log(`Physics FPS increased to ${this.targetFPS}`);
    }
    // 성능이 나쁘면 품질 감소
    else if (avgFrameTime > 25 && this.targetFPS > 15) {
        this.targetFPS = Math.max(15, this.targetFPS - 5);
        console.log(`Physics FPS decreased to ${this.targetFPS}`);
    }
}

manageLongTermExecution() {
    const now = Date.now();
    this.runTime = now - this.startTime;
    
    // 주기적 정리 (5분마다)
    if (now - this.lastCleanupTime > this.cleanupInterval) {
        this.performMaintenanceCleanup();
        this.lastCleanupTime = now;
    }
    
    // 최대 실행 시간 체크 (24시간)
    if (this.runTime > this.maxRunTime) {
        console.warn('Physics simulation has been running for 24 hours. Performing full restart...');
        this.performFullRestart();
    }
}

performMaintenanceCleanup() {
    console.log(`Physics maintenance cleanup (running for ${Math.floor(this.runTime / 1000 / 60)} minutes)`);
    
    // 성능 통계 히스토리 정리
    if (this.performanceStats.frameTimeHistory.length > 100) {
        this.performanceStats.frameTimeHistory = this.performanceStats.frameTimeHistory.slice(-60);
    }
    
    // 노드 상태 정규화 (누적 오차 방지)
    this.normalizeNodeStates();
    
    // 메모리 사용량 추정 및 정리
    this.estimateMemoryUsage();
    
    // 가비지 컬렉션 힌트
    if (window.gc) {
        window.gc();
    }
}

normalizeNodeStates() {
    this.nodeStates.forEach((state, nodeId) => {
        // 속도가 너무 크면 제한
        const maxVelocity = 100;
        state.velocity.x = Math.max(-maxVelocity, Math.min(maxVelocity, state.velocity.x));
        state.velocity.y = Math.max(-maxVelocity, Math.min(maxVelocity, state.velocity.y));
        
        // 힘이 너무 크면 제한
        const maxForce = 200;
        state.force.x = Math.max(-maxForce, Math.min(maxForce, state.force.x));
        state.force.y = Math.max(-maxForce, Math.min(maxForce, state.force.y));
        
        // NaN이나 무한대 값 정리
        if (!isFinite(state.velocity.x)) state.velocity.x = 0;
        if (!isFinite(state.velocity.y)) state.velocity.y = 0;
        if (!isFinite(state.force.x)) state.force.x = 0;
        if (!isFinite(state.force.y)) state.force.y = 0;
    });
}

estimateMemoryUsage() {
    // 대략적인 메모리 사용량 추정
    const nodeStateSize = this.nodeStates.size * 100; // 노드당 약 100바이트
    const historySize = this.performanceStats.frameTimeHistory.length * 8;
    
    this.performanceStats.memoryUsage = nodeStateSize + historySize;
    
    // 메모리 사용량이 너무 크면 최적화
    if (this.performanceStats.memoryUsage > 50000) { // 50KB 이상
        console.warn('High memory usage detected, optimizing...');
        this.performanceStats.frameTimeHistory = this.performanceStats.frameTimeHistory.slice(-30);
    }
}

performFullRestart() {
    console.log('Performing full 24-hour restart...');
    
    // 전체 시스템 재시작
    this.fullRestart();
    
    // 시작 시간 리셋
    this.startTime = Date.now();
    this.runTime = 0;
}

setupUserActivityTracking() {
    // 마우스 움직임 감지
    this.userActivityHandlers = {
        mousemove: () => this.updateUserActivity(),
        mousedown: () => this.updateUserActivity(),
        keydown: () => this.updateUserActivity(),
        scroll: () => this.updateUserActivity(),
        touchstart: () => this.updateUserActivity()
    };
    
    // 이벤트 리스너 등록
    Object.keys(this.userActivityHandlers).forEach(event => {
        document.addEventListener(event, this.userActivityHandlers[event], { passive: true });
    });
}

cleanupUserActivityTracking() {
    if (this.userActivityHandlers) {
        Object.keys(this.userActivityHandlers).forEach(event => {
            document.removeEventListener(event, this.userActivityHandlers[event]);
        });
        this.userActivityHandlers = null;
    }
}

updateUserActivity() {
    this.lastUserActivity = Date.now();
    
    // 배터리 절약 모드 해제
    if (this.powerSaveMode) {
        this.powerSaveMode = false;
        console.log('User activity detected, exiting power save mode');
    }
}

// 🔋 배터리 및 성능 최적화
enablePowerSaveMode() {
    this.powerSaveMode = true;
    this.targetFPS = 15; // 15fps로 제한
    console.log('Power save mode enabled');
}

disablePowerSaveMode() {
    this.powerSaveMode = false;
    this.targetFPS = 60; // 60fps로 복원
    console.log('Power save mode disabled');
}

setPerformanceMode(mode) {
    this.performanceMode = mode;
    switch (mode) {
        case 'high':
            this.targetFPS = 60;
            break;
        case 'medium':
            this.targetFPS = 30;
            break;
        case 'low':
            this.targetFPS = 15;
            break;
        case 'adaptive':
            // 적응형 모드는 자동 조절
            break;
    }
    console.log(`Performance mode set to: ${mode}`);
}

// 📊 상태 정보 조회
getPerformanceInfo() {
    return {
        runTime: this.runTime,
        frameCount: this.frameCount,
        averageFrameTime: this.performanceStats.averageFrameTime,
        currentFPS: Math.round(1000 / this.performanceStats.averageFrameTime),
        targetFPS: this.targetFPS,
        performanceMode: this.performanceMode,
        powerSaveMode: this.powerSaveMode,
        backgroundMode: this.backgroundMode,
        memoryUsage: this.performanceStats.memoryUsage,
        userInactiveTime: Date.now() - this.lastUserActivity
    };
}
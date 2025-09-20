#!/bin/bash

# Установка строгого режима
set -euo pipefail

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Логирование
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Проверка зависимостей
check_dependencies() {
    local missing_deps=()
    
    if ! command -v pnpm &> /dev/null; then
        missing_deps+=("pnpm")
    fi
    
    if ! command -v netstat &> /dev/null && ! command -v ss &> /dev/null; then
        missing_deps+=("netstat or ss")
    fi
    
    if ! command -v lsof &> /dev/null; then
        missing_deps+=("lsof")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "Missing dependencies: ${missing_deps[*]}"
        log_info "Please install missing dependencies and try again"
        exit 1
    fi
}

echo -e "${BLUE}🚀 SuperMock Development Environment${NC}"
echo "=================================="

# Проверяем зависимости
check_dependencies

# Функция для проверки занятости порта
check_port() {
    local port=$1
    local timeout=2
    
    # Используем ss если доступен, иначе netstat
    if command -v ss &> /dev/null; then
        if timeout $timeout ss -tlnp 2>/dev/null | grep -q ":$port "; then
            return 0  # Порт занят
        fi
    elif command -v netstat &> /dev/null; then
        if timeout $timeout netstat -tlnp 2>/dev/null | grep -q ":$port "; then
            return 0  # Порт занят
        fi
    fi
    
    # Дополнительная проверка через lsof
    if timeout $timeout lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Порт занят
    fi
    
    return 1  # Порт свободен
}

# Функция для проверки, является ли процесс на порту нашим сервисом
is_our_service() {
    local port=$1
    local service_name=$2
    
    # Проверяем, что это наш Next.js или Node.js процесс
    local pids=$(lsof -ti:$port 2>/dev/null || true)
    
    if [ -z "$pids" ]; then
        return 1  # Порт свободен
    fi
    
    for pid in $pids; do
        # Проверяем командную строку процесса
        local cmdline=$(ps -p "$pid" -o cmd= 2>/dev/null || true)
        
        if [[ "$cmdline" == *"next-server"* ]] || [[ "$cmdline" == *"tsx watch"* ]] || [[ "$cmdline" == *"node"* ]]; then
            log_info "Port $port is occupied by our $service_name service (PID: $pid)"
            return 0  # Это наш сервис
        fi
    done
    
    return 1  # Это не наш сервис
}

# Функция для освобождения порта
free_port() {
    local port=$1
    local service_name=$2
    local max_attempts=3
    local attempt=0
    
    # Сначала проверяем, не наш ли это уже работающий сервис
    if is_our_service "$port" "$service_name"; then
        log_info "Port $port is already occupied by our $service_name service"
        return 0  # Порт уже занят нашим сервисом
    fi
    
    while [ $attempt -lt $max_attempts ]; do
        local pids=$(lsof -ti:$port 2>/dev/null || true)
        
        if [ -z "$pids" ]; then
            return 0  # Порт свободен
        fi
        
        log_warning "Port $port is busy, killing processes: $pids"
        
        # Пытаемся мягко завершить процессы
        for pid in $pids; do
            if kill -TERM "$pid" 2>/dev/null; then
                sleep 2
                if kill -0 "$pid" 2>/dev/null; then
                    log_warning "Force killing process $pid"
                    kill -KILL "$pid" 2>/dev/null || true
                fi
            fi
        done
        
        sleep 1
        attempt=$((attempt + 1))
    done
    
    log_error "Failed to free port $port after $max_attempts attempts"
    return 1
}

# Функция для запуска сервиса
start_service() {
    local service=$1
    local port=$2
    local name=$3
    local log_file="/tmp/supermock-${service}.log"
    
    log_info "Starting $name..."
    
    # Проверяем и освобождаем порт если нужно
    if check_port $port; then
        if is_our_service "$port" "$name"; then
            log_info "Port $port is already occupied by our $name service"
            # Проверяем, что сервис действительно работает
            if [[ "$service" == "server" ]]; then
                if curl -s -f "http://localhost:$port/health" >/dev/null 2>&1; then
                    log_success "$name is already running on http://localhost:$port"
                    return 0
                fi
            elif [[ "$service" == "app" || "$service" == "landing" ]]; then
                if curl -s -f "http://localhost:$port" >/dev/null 2>&1; then
                    log_success "$name is already running on http://localhost:$port"
                    return 0
                fi
            fi
        fi
        
        if ! free_port $port "$name"; then
            log_error "Cannot free port $port for $name"
            return 1
        fi
    fi
    
    # Очищаем лог файл
    > "$log_file"
    
    # Запускаем сервис в фоне с логированием
    case $service in
        "server")
            pnpm --filter ./server dev > "$log_file" 2>&1 &
            ;;
        "app")
            pnpm --filter ./app dev --port $port > "$log_file" 2>&1 &
            ;;
        "landing")
            pnpm --filter ./landing dev --port $port > "$log_file" 2>&1 &
            ;;
        *)
            log_error "Unknown service: $service"
            return 1
            ;;
    esac
    
    local pid=$!
    log_info "Waiting for $name to start (PID: $pid)..."
    
    # Ждем запуска сервиса с более умной логикой
    local attempts=0
    local max_attempts=30  # Увеличиваем время ожидания
    local check_interval=1
    
    # Для Next.js приложений ждем дольше
    if [[ "$service" == "app" || "$service" == "landing" ]]; then
        max_attempts=60
        check_interval=2
    fi
    
    while [ $attempts -lt $max_attempts ]; do
        # Проверяем что процесс еще жив
        if ! kill -0 "$pid" 2>/dev/null; then
            log_error "$name process died. Check logs: $log_file"
            if [ -f "$log_file" ]; then
                log_error "Last 10 lines of log:"
                tail -10 "$log_file" | sed 's/^/  /'
            fi
            return 1
        fi
        
        # Проверяем что порт занят
        if check_port $port; then
            # Дополнительная проверка для HTTP сервисов
            if [[ "$service" == "app" || "$service" == "landing" ]]; then
                if curl -s -f "http://localhost:$port" >/dev/null 2>&1; then
                    log_success "$name is running on http://localhost:$port"
                    return 0
                fi
            elif [[ "$service" == "server" ]]; then
                if curl -s -f "http://localhost:$port/health" >/dev/null 2>&1; then
                    log_success "$name is running on http://localhost:$port"
                    return 0
                fi
            else
                log_success "$name is running on http://localhost:$port"
                return 0
            fi
        fi
        
        attempts=$((attempts + 1))
        sleep $check_interval
    done
    
    log_error "Failed to start $name on port $port after $max_attempts attempts"
    if [ -f "$log_file" ]; then
        log_error "Log file: $log_file"
        log_error "Last 20 lines:"
        tail -20 "$log_file" | sed 's/^/  /'
    fi
    return 1
}

# Функция для показа статуса
show_status() {
    log_info "Service Status:"
    echo "=================="
    
    local all_running=true
    
    for port in 3000 3002 4000; do
        local service=""
        local health_url=""
        
        case $port in
            3000) 
                service="App"
                health_url="http://localhost:$port"
                ;;
            3002) 
                service="Landing"
                health_url="http://localhost:$port"
                ;;
            4000) 
                service="Server"
                health_url="http://localhost:$port/health"
                ;;
        esac
        
        if check_port $port; then
            # Дополнительная проверка здоровья сервиса
            if curl -s -f "$health_url" >/dev/null 2>&1; then
                log_success "$service: http://localhost:$port"
            else
                log_warning "$service: Port $port is open but service not responding"
                all_running=false
            fi
        else
            log_error "$service: Not running"
            all_running=false
        fi
    done
    
    if [ "$all_running" = true ]; then
        log_success "All services are running properly"
    else
        log_warning "Some services are not running properly"
    fi
}

# Функция для остановки всех сервисов
stop_all() {
    log_info "Stopping all services..."
    
    # Останавливаем через kill-ports.sh
    if [ -f "./scripts/kill-ports.sh" ]; then
        if ./scripts/kill-ports.sh; then
            log_success "All services stopped"
        else
            log_warning "Some services may still be running"
        fi
    else
        log_error "kill-ports.sh script not found"
        return 1
    fi
    
    # Очищаем лог файлы
    rm -f /tmp/supermock-*.log 2>/dev/null || true
}

# Функция для запуска всех сервисов
start_all_services() {
    log_info "Starting all services sequentially..."
    
    local failed_services=()
    
    # Запускаем сервисы по порядку
    if ! start_service "server" 4000 "Server"; then
        failed_services+=("Server")
    fi
    
    if ! start_service "app" 3000 "App"; then
        failed_services+=("App")
    fi
    
    if ! start_service "landing" 3002 "Landing"; then
        failed_services+=("Landing")
    fi
    
    # Показываем результат
    if [ ${#failed_services[@]} -eq 0 ]; then
        log_success "All services started successfully!"
    else
        log_error "Failed to start: ${failed_services[*]}"
        log_info "Check logs in /tmp/supermock-*.log for details"
        return 1
    fi
}

# Обработка аргументов командной строки
case "${1:-all}" in
    "server")
        if start_service "server" 4000 "Server"; then
            show_status
        else
            exit 1
        fi
        ;;
    "app")
        if start_service "app" 3000 "App"; then
            show_status
        else
            exit 1
        fi
        ;;
    "landing")
        if start_service "landing" 3002 "Landing"; then
            show_status
        else
            exit 1
        fi
        ;;
    "stop")
        stop_all
        exit 0
        ;;
    "status")
        show_status
        exit 0
        ;;
    "logs")
        # Показать логи сервисов
        log_info "Service logs:"
        for service in server app landing; do
            log_file="/tmp/supermock-${service}.log"
            if [ -f "$log_file" ]; then
                echo -e "\n${BLUE}=== $service logs ===${NC}"
                tail -20 "$log_file"
            else
                log_warning "No logs found for $service"
            fi
        done
        exit 0
        ;;
    "all"|*)
        if start_all_services; then
            show_status
            echo -e "\n${GREEN}🎉 Development environment is ready!${NC}"
            echo -e "${BLUE}💡 Use 'pnpm start:dev stop' to stop all services${NC}"
            echo -e "${BLUE}💡 Use 'pnpm start:dev status' to check status${NC}"
            echo -e "${BLUE}💡 Use 'pnpm start:dev logs' to view service logs${NC}"
        else
            log_error "Failed to start all services"
            exit 1
        fi
        ;;
esac

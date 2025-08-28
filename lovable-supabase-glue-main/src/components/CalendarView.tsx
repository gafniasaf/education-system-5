import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths } from 'date-fns';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, BookOpen, FileText, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: 'assignment' | 'announcement' | 'course' | 'personal';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  course?: string;
  description?: string;
  status?: 'upcoming' | 'due_today' | 'overdue' | 'completed';
}

export const CalendarView: React.FC = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<CalendarEvent[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');

  useEffect(() => {
    if (user && profile) {
      fetchEvents();
      fetchCourses();
    }
  }, [user, profile, currentDate]);

  useEffect(() => {
    filterEvents();
  }, [events, selectedCourse, selectedType]);

  const fetchEvents = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const eventsData: CalendarEvent[] = [];

      // Get date range for current view
      const startDate = startOfMonth(currentDate);
      const endDate = endOfMonth(currentDate);

      // Fetch assignments
      const { data: assignments } = await supabase
        .from('assignments')
        .select(`
          id,
          title,
          description,
          due_date,
          course_id,
          courses (title)
        `)
        .not('due_date', 'is', null)
        .gte('due_date', startDate.toISOString())
        .lte('due_date', endDate.toISOString());

      if (assignments) {
        const assignmentEvents = assignments.map(assignment => {
          const dueDate = new Date(assignment.due_date);
          const now = new Date();
          let status: CalendarEvent['status'] = 'upcoming';
          
          if (isSameDay(dueDate, now)) {
            status = 'due_today';
          } else if (dueDate < now) {
            status = 'overdue';
          }

          return {
            id: assignment.id,
            title: assignment.title,
            date: assignment.due_date,
            type: 'assignment' as const,
            course: (assignment.courses as any)?.title || 'Unknown Course',
            description: assignment.description,
            status,
          };
        });
        eventsData.push(...assignmentEvents);
      }

      // Fetch announcements with expiry dates
      const { data: announcements } = await supabase
        .from('announcements')
        .select(`
          id,
          title,
          content,
          priority,
          expires_at,
          course_id,
          courses (title)
        `)
        .not('expires_at', 'is', null)
        .gte('expires_at', startDate.toISOString())
        .lte('expires_at', endDate.toISOString());

      if (announcements) {
        const announcementEvents = announcements.map(announcement => ({
          id: announcement.id,
          title: `📢 ${announcement.title}`,
          date: announcement.expires_at,
          type: 'announcement' as const,
          priority: announcement.priority as CalendarEvent['priority'],
          course: (announcement.courses as any)?.title || 'Unknown Course',
          description: announcement.content,
          status: 'upcoming' as const,
        }));
        eventsData.push(...announcementEvents);
      }

      // Sort events by date
      eventsData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      setEvents(eventsData);
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      toast({
        title: "Error",
        description: "Failed to load calendar events",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    if (!user || !profile) return;

    try {
      let query = supabase.from('courses').select('id, title');

      if (profile.role === 'teacher') {
        query = query.eq('teacher_id', user.id);
      } else if (profile.role === 'student') {
        const { data: enrollments } = await supabase
          .from('enrollments')
          .select('course_id')
          .eq('student_id', user.id);

        if (enrollments && enrollments.length > 0) {
          const courseIds = enrollments.map(e => e.course_id);
          query = query.in('id', courseIds);
        }
      }

      const { data } = await query.order('title');
      setCourses(data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const filterEvents = () => {
    let filtered = [...events];

    if (selectedCourse !== 'all') {
      const selectedCourseTitle = courses.find(c => c.id === selectedCourse)?.title;
      filtered = filtered.filter(event => event.course === selectedCourseTitle);
    }

    if (selectedType !== 'all') {
      filtered = filtered.filter(event => event.type === selectedType);
    }

    setFilteredEvents(filtered);
  };

  const getEventsForDate = (date: Date) => {
    return filteredEvents.filter(event => isSameDay(new Date(event.date), date));
  };

  const getEventColor = (event: CalendarEvent) => {
    switch (event.type) {
      case 'assignment':
        if (event.status === 'overdue') return 'bg-red-500 text-white';
        if (event.status === 'due_today') return 'bg-orange-500 text-white';
        return 'bg-blue-500 text-white';
      case 'announcement':
        switch (event.priority) {
          case 'urgent': return 'bg-red-600 text-white';
          case 'high': return 'bg-orange-600 text-white';
          case 'low': return 'bg-gray-500 text-white';
          default: return 'bg-green-500 text-white';
        }
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getEventIcon = (event: CalendarEvent) => {
    switch (event.type) {
      case 'assignment':
        return <FileText className="h-3 w-3" />;
      case 'announcement':
        return <AlertTriangle className="h-3 w-3" />;
      case 'course':
        return <BookOpen className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    return (
      <div className="grid grid-cols-7 gap-1">
        {/* Header */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-2 text-center font-medium text-sm text-muted-foreground border-b">
            {day}
          </div>
        ))}
        
        {/* Days */}
        {days.map(day => {
          const dayEvents = getEventsForDate(day);
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "min-h-[120px] p-1 border cursor-pointer hover:bg-muted/50 transition-colors",
                !isCurrentMonth && "text-muted-foreground bg-muted/20",
                isToday(day) && "bg-primary/10",
                isSelected && "ring-2 ring-primary"
              )}
              onClick={() => setSelectedDate(day)}
            >
              <div className={cn(
                "text-sm font-medium mb-1",
                isToday(day) && "text-primary font-bold"
              )}>
                {format(day, 'd')}
              </div>
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map(event => (
                  <div
                    key={event.id}
                    className={cn(
                      "text-xs p-1 rounded truncate flex items-center gap-1",
                      getEventColor(event)
                    )}
                    title={`${event.title} - ${event.course}`}
                  >
                    {getEventIcon(event)}
                    <span className="truncate">{event.title}</span>
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate);
    const weekEnd = endOfWeek(currentDate);
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    return (
      <div className="grid grid-cols-7 gap-4">
        {days.map(day => {
          const dayEvents = getEventsForDate(day);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          
          return (
            <div key={day.toISOString()} className="space-y-2">
              <div
                className={cn(
                  "text-center p-2 rounded cursor-pointer hover:bg-muted transition-colors",
                  isToday(day) && "bg-primary text-primary-foreground",
                  isSelected && !isToday(day) && "bg-muted"
                )}
                onClick={() => setSelectedDate(day)}
              >
                <div className="text-sm font-medium">
                  {format(day, 'EEE')}
                </div>
                <div className="text-lg font-bold">
                  {format(day, 'd')}
                </div>
              </div>
              <div className="space-y-1">
                {dayEvents.map(event => (
                  <Card key={event.id} className="p-2">
                    <div className="flex items-center gap-2">
                      {getEventIcon(event)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{event.title}</p>
                        <p className="text-xs text-muted-foreground">{event.course}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(event.date), 'h:mm a')}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderDayView = () => {
    const viewDate = selectedDate || currentDate;
    const dayEvents = getEventsForDate(viewDate);

    return (
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold">{format(viewDate, 'EEEE, MMMM d, yyyy')}</h3>
        </div>
        
        {dayEvents.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <CalendarIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No events scheduled for this day</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {dayEvents.map(event => (
              <Card key={event.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getEventIcon(event)}
                      <div>
                        <CardTitle className="text-base">{event.title}</CardTitle>
                        <CardDescription>{event.course}</CardDescription>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge className={getEventColor(event)} variant="secondary">
                        {event.type}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(event.date), 'h:mm a')}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                {event.description && (
                  <CardContent>
                    <p className="text-sm">{event.description}</p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Calendar</h2>
          <p className="text-muted-foreground">View your assignments and important dates</p>
        </div>
        <div className="flex gap-2">
          <Tabs value={view} onValueChange={(value) => setView(value as any)}>
            <TabsList>
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="day">Day</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select value={selectedCourse} onValueChange={setSelectedCourse}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All courses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Courses</SelectItem>
            {courses.map((course) => (
              <SelectItem key={course.id} value={course.id}>
                {course.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="assignment">Assignments</SelectItem>
            <SelectItem value="announcement">Announcements</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold min-w-[200px] text-center">
            {format(currentDate, 'MMMM yyyy')}
          </h3>
          <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button 
          variant="outline" 
          onClick={() => {
            setCurrentDate(new Date());
            setSelectedDate(new Date());
          }}
        >
          Today
        </Button>
      </div>

      {/* Calendar Content */}
      <Card>
        <CardContent className="p-6">
          {view === 'month' && renderMonthView()}
          {view === 'week' && renderWeekView()}
          {view === 'day' && renderDayView()}
        </CardContent>
      </Card>

      {/* Event Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span className="text-sm">Assignments</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-500 rounded"></div>
              <span className="text-sm">Due Today</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span className="text-sm">Overdue</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-sm">Announcements</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};